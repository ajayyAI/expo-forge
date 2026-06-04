"use node";

import {
  createHash,
  createPublicKey,
  timingSafeEqual as nodeTimingSafeEqual,
  randomBytes,
  verify,
  X509Certificate,
} from "node:crypto";
import { decode } from "cbor-x";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { action } from "./_generated/server";

// ---------------------------------------------------------------------------
// Apple App Attest Root CA.
//
// Pinned in source (not fetched) so a compromised CDN can't swap the trust
// anchor under us — the whole chain ultimately reduces to trusting this cert.
// Published by Apple: https://www.apple.com/certificateauthority/private/
// ("Apple App Attestation Root CA").
// ---------------------------------------------------------------------------
const APPLE_APP_ATTEST_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/
MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

// Apple's nonce extension OID, carrying SHA256(authData || clientDataHash).
// https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
const APPLE_NONCE_OID = "1.2.840.113635.100.8.2";

// AAGUID values Apple writes into authData. Production binaries carry
// "appattest" + 7 NUL bytes; development builds carry "appattestdevelop".
const AAGUID_PROD = Buffer.concat([
  Buffer.from("appattest"),
  Buffer.alloc(7, 0),
]);
const AAGUID_DEV = Buffer.from("appattestdevelop");

type Environment = "development" | "production";

// ---------------------------------------------------------------------------
// Deterministic crypto + ASN.1 helpers (exported for unit testing).
// ---------------------------------------------------------------------------

export function sha256(...parts: Buffer[]): Buffer {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
  }
  return hash.digest();
}

/** Constant-time equality. Returns false for length mismatch (never throws). */
export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return nodeTimingSafeEqual(a, b);
}

/**
 * Read a DER length octet at `offset`. Returns the decoded length and the
 * offset of the first content byte. Handles the short form (high bit clear)
 * and the long form (high bit set → low 7 bits are the byte-count of the
 * length). Indefinite-length (0x80) is invalid in DER and rejected.
 */
export function readDerLength(
  buf: Buffer,
  offset: number
): { length: number; next: number } {
  const first = buf[offset];
  if (first === undefined) {
    throw new Error("DER length out of bounds");
  }
  if (first < 0x80) {
    return { length: first, next: offset + 1 };
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: DER long-form length encodes the byte-count in the low 7 bits.
  const numBytes = first & 0x7f;
  if (numBytes === 0 || numBytes > 4) {
    throw new Error("Unsupported DER length encoding");
  }
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    const byte = buf[offset + 1 + i];
    if (byte === undefined) {
      throw new Error("DER length out of bounds");
    }
    // biome-ignore lint/suspicious/noBitwiseOperators: big-endian length accumulation across length octets.
    length = (length << 8) | byte;
  }
  return { length, next: offset + 1 + numBytes };
}

/**
 * Encode a dotted OID string to its DER content bytes (without the tag/length
 * prefix). First two arcs pack into one byte as `40*a + b`; the rest use
 * base-128 with a continuation high bit on all but the last septet.
 */
export function encodeOid(oid: string): Buffer {
  const arcs = oid.split(".").map((n) => Number.parseInt(n, 10));
  if (arcs.length < 2 || arcs.some((n) => Number.isNaN(n) || n < 0)) {
    throw new Error(`Invalid OID: ${oid}`);
  }
  const bytes: number[] = [40 * arcs[0] + arcs[1]];
  for (const arc of arcs.slice(2)) {
    const septets: number[] = [];
    let value = arc;
    do {
      // biome-ignore lint/suspicious/noBitwiseOperators: OID arcs use base-128 (7-bit) groups.
      septets.unshift(value & 0x7f);
      // biome-ignore lint/suspicious/noBitwiseOperators: shift to the next base-128 group.
      value >>>= 7;
    } while (value > 0);
    for (let i = 0; i < septets.length - 1; i++) {
      // biome-ignore lint/suspicious/noBitwiseOperators: set the continuation high bit on all but the final septet.
      septets[i] |= 0x80;
    }
    bytes.push(...septets);
  }
  return Buffer.from(bytes);
}

interface AuthData {
  rpIdHash: Buffer;
  flags: number;
  counter: number;
  aaguid: Buffer;
  credentialId: Buffer;
  credentialPublicKey: Buffer;
}

/**
 * Parse WebAuthn-style authenticatorData. App Attest attestations always carry
 * the attested-credential block (AAGUID + credId + key); assertions do not, so
 * `parseCredential` is opt-in.
 *
 * Layout: rpIdHash[32] flags[1] counter[4 BE] then, when present,
 * aaguid[16] credIdLen[2 BE] credId[credIdLen] credentialPublicKey[rest].
 */
export function parseAuthData(buf: Buffer, parseCredential: boolean): AuthData {
  const minLen = parseCredential ? 55 : 37;
  if (buf.length < minLen) {
    throw new Error("authenticatorData too short");
  }
  const rpIdHash = buf.subarray(0, 32);
  const flags = buf[32];
  const counter = buf.readUInt32BE(33);

  if (!parseCredential) {
    return {
      rpIdHash,
      flags,
      counter,
      aaguid: Buffer.alloc(0),
      credentialId: Buffer.alloc(0),
      credentialPublicKey: Buffer.alloc(0),
    };
  }

  const aaguid = buf.subarray(37, 53);
  const credIdLen = buf.readUInt16BE(53);
  const credIdEnd = 55 + credIdLen;
  if (buf.length < credIdEnd) {
    throw new Error("authenticatorData credential id out of bounds");
  }
  const credentialId = buf.subarray(55, credIdEnd);
  const credentialPublicKey = buf.subarray(credIdEnd);
  return {
    rpIdHash,
    flags,
    counter,
    aaguid,
    credentialId,
    credentialPublicKey,
  };
}

/**
 * Pull Apple's nonce out of the leaf certificate.
 *
 * Node's X509Certificate exposes no arbitrary-extension accessor, so we walk
 * the raw DER: find the extension's OID, skip an optional `critical` BOOLEAN,
 * unwrap the extnValue OCTET STRING, then the inner SEQUENCE, the `[1]`
 * context tag, and finally the OCTET STRING that holds the 32-byte nonce.
 */
export function extractAppleNonceExtension(certDer: Buffer): Buffer {
  const oidContent = encodeOid(APPLE_NONCE_OID);
  // OID TLV: 0x06 <len> <content>.
  const oidTlv = Buffer.concat([
    Buffer.from([0x06, oidContent.length]),
    oidContent,
  ]);
  const oidPos = certDer.indexOf(oidTlv);
  if (oidPos < 0) {
    throw new Error("Apple nonce extension not found");
  }

  let cursor = oidPos + oidTlv.length;
  // Optional critical BOOLEAN (0x01 0x01 0xFF).
  if (certDer[cursor] === 0x01) {
    const { next } = readDerLength(certDer, cursor + 1);
    cursor = next + 1; // skip the boolean value byte
  }
  // extnValue: OCTET STRING wrapping the extension's DER.
  if (certDer[cursor] !== 0x04) {
    throw new Error("Malformed Apple nonce extension (expected OCTET STRING)");
  }
  cursor = readDerLength(certDer, cursor + 1).next;
  // Inner SEQUENCE.
  if (certDer[cursor] !== 0x30) {
    throw new Error("Malformed Apple nonce extension (expected SEQUENCE)");
  }
  cursor = readDerLength(certDer, cursor + 1).next;
  // [1] context-specific tag.
  if (certDer[cursor] !== 0xa1) {
    throw new Error("Malformed Apple nonce extension (expected [1] tag)");
  }
  cursor = readDerLength(certDer, cursor + 1).next;
  // OCTET STRING holding the nonce.
  if (certDer[cursor] !== 0x04) {
    throw new Error(
      "Malformed Apple nonce extension (expected nonce OCTET STRING)"
    );
  }
  const { length, next } = readDerLength(certDer, cursor + 1);
  return certDer.subarray(next, next + length);
}

// ---------------------------------------------------------------------------
// Pure verifiers (exported for unit testing).
// ---------------------------------------------------------------------------

const ROOT_CERT = new X509Certificate(APPLE_APP_ATTEST_ROOT_CA);

/** Throw if `cert` is outside its validFrom..validTo window right now. */
function assertCertValidity(cert: X509Certificate, label: string): void {
  const now = Date.now();
  if (Date.parse(cert.validFrom) > now || Date.parse(cert.validTo) < now) {
    throw new Error(`${label} certificate is not currently valid`);
  }
}

export function aaguidMatches(
  aaguid: Buffer,
  environment: Environment
): boolean {
  if (timingSafeEqual(aaguid, AAGUID_PROD)) {
    return true;
  }
  // Dev AAGUID is only acceptable in a development deployment.
  return environment === "development" && timingSafeEqual(aaguid, AAGUID_DEV);
}

interface AttestationInput {
  keyId: string;
  attestation: Buffer;
  challenge: string;
  bundleId: string;
  teamId: string;
  environment: Environment;
}

/**
 * Full Apple App Attest attestation verification. Returns the device's public
 * key (DER SPKI, base64url) on success; throws on any failure.
 *
 * Steps follow Apple's "Validating Apps That Connect to Your Server":
 * https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
 */
export function verifyAttestationBytes(input: AttestationInput): {
  publicKey: string;
  environment: Environment;
} {
  const decoded = decode(input.attestation) as {
    fmt?: string;
    attStmt?: { x5c?: Buffer[] };
    authData?: Buffer;
  };

  if (decoded.fmt !== "apple-appattest") {
    throw new Error(`Unexpected attestation format: ${decoded.fmt}`);
  }
  const x5c = decoded.attStmt?.x5c;
  if (!x5c || x5c.length < 2) {
    throw new Error("Attestation missing certificate chain");
  }
  const authData = decoded.authData;
  if (!authData) {
    throw new Error("Attestation missing authData");
  }

  // 2. Verify the chain up to the pinned root, then check leaf validity.
  const credCert = new X509Certificate(x5c[0]);
  const intermediate = new X509Certificate(x5c[1]);
  if (!intermediate.verify(ROOT_CERT.publicKey)) {
    throw new Error("Intermediate not signed by Apple App Attest root");
  }
  if (!credCert.verify(intermediate.publicKey)) {
    throw new Error("Leaf not signed by intermediate");
  }
  assertCertValidity(intermediate, "Intermediate");
  assertCertValidity(credCert, "Leaf");

  // 3. expectedNonce = sha256(authData || sha256(challenge utf8)).
  const clientDataHash = sha256(Buffer.from(input.challenge, "utf8"));
  const expectedNonce = sha256(authData, clientDataHash);

  // 4. Compare against the nonce embedded in the leaf cert.
  const certNonce = extractAppleNonceExtension(credCert.raw);
  if (!timingSafeEqual(certNonce, expectedNonce)) {
    throw new Error("Attestation nonce mismatch");
  }

  // 5. keyId must equal sha256(public key DER SPKI), base64.
  const credPubKeyDer = credCert.publicKey.export({
    type: "spki",
    format: "der",
  });
  const computedKeyId = sha256(credPubKeyDer).toString("base64");
  if (computedKeyId !== input.keyId) {
    throw new Error("keyId does not match attested public key");
  }

  // 6. Validate authData fields.
  const parsed = parseAuthData(authData, true);
  const expectedRpId = sha256(
    Buffer.from(`${input.teamId}.${input.bundleId}`, "utf8")
  );
  if (!timingSafeEqual(parsed.rpIdHash, expectedRpId)) {
    throw new Error("rpIdHash mismatch (teamId/bundleId)");
  }
  if (parsed.counter !== 0) {
    throw new Error("Attestation counter must be 0");
  }
  if (!aaguidMatches(parsed.aaguid, input.environment)) {
    throw new Error("Unexpected AAGUID for this environment");
  }
  if (parsed.credentialId.toString("base64") !== input.keyId) {
    throw new Error("credentialId does not match keyId");
  }

  return {
    publicKey: credPubKeyDer.toString("base64url"),
    environment: input.environment,
  };
}

interface AssertionInput {
  assertion: Buffer;
  payload: string;
  bundleId: string;
  teamId: string;
  publicKey: Buffer;
  storedCounter: number;
}

/**
 * Verify an App Attest assertion against a previously stored public key.
 * Returns the new (strictly greater) counter; throws on any failure.
 */
export function verifyAssertionBytes(input: AssertionInput): number {
  const decoded = decode(input.assertion) as {
    signature?: Buffer;
    authenticatorData?: Buffer;
  };
  if (!decoded.signature) {
    throw new Error("Assertion missing signature");
  }
  if (!decoded.authenticatorData) {
    throw new Error("Assertion missing authenticatorData");
  }

  // hashedData = sha256(authenticatorData || sha256(payload utf8)).
  const clientDataHash = sha256(Buffer.from(input.payload, "utf8"));
  const hashedData = sha256(decoded.authenticatorData, clientDataHash);

  const pubKey = createPublicKey({
    key: input.publicKey,
    format: "der",
    type: "spki",
  });

  // Apple's signature encoding varies across iOS versions (DER ASN.1 sequence
  // vs raw IEEE-P1363 r||s), so accept either.
  const derValid = verify(null, hashedData, pubKey, decoded.signature);
  const p1363Valid =
    !derValid &&
    verify(
      null,
      hashedData,
      { key: pubKey, dsaEncoding: "ieee-p1363" },
      decoded.signature
    );
  if (!(derValid || p1363Valid)) {
    throw new Error("Assertion signature verification failed");
  }

  const parsed = parseAuthData(decoded.authenticatorData, false);
  const expectedRpId = sha256(
    Buffer.from(`${input.teamId}.${input.bundleId}`, "utf8")
  );
  if (!timingSafeEqual(parsed.rpIdHash, expectedRpId)) {
    throw new Error("rpIdHash mismatch (teamId/bundleId)");
  }
  if (parsed.counter <= input.storedCounter) {
    throw new Error(
      `Non-monotonic assertion counter: ${parsed.counter} <= ${input.storedCounter}`
    );
  }
  return parsed.counter;
}

// ---------------------------------------------------------------------------
// Configuration.
//
// These are Convex deployment env vars (set via `bunx convex env set`), all
// optional until App Attest is enabled:
//   - APP_ATTEST_ENVIRONMENT: "production" | "development" (default development)
//   - APP_BUNDLE_ID:          the app's bundle identifier
//   - APPLE_TEAM_ID:          the Apple Developer team id
//
// Convex exposes no built-in production/development flag (only CONVEX_CLOUD_URL
// / CONVEX_SITE_URL, which are URLs, not a deployment-type), so we read the
// explicit var and default to development — the conservative choice, since the
// dev AAGUID is only ever accepted in a development deployment.
// ---------------------------------------------------------------------------
function resolveEnvironment(): Environment {
  return process.env.APP_ATTEST_ENVIRONMENT === "production"
    ? "production"
    : "development";
}

function resolveBundleId(arg?: string): string {
  const value = arg ?? process.env.APP_BUNDLE_ID;
  if (!value) {
    throw new Error("APP_BUNDLE_ID is not configured");
  }
  return value;
}

function resolveTeamId(arg?: string): string {
  const value = arg ?? process.env.APPLE_TEAM_ID;
  if (!value) {
    throw new Error("APPLE_TEAM_ID is not configured");
  }
  return value;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public actions — the client transport. Declared as `action` (not
// `internalAction`) so the app can call them directly; the verifier internals
// above stay private to this module.
// ---------------------------------------------------------------------------

/**
 * Issue a fresh single-use challenge nonce.
 *
 * Challenge issuance is rate-limited globally inside createChallenge (the
 * appAttestChallenge bucket), so every nonce minted through this
 * unauthenticated surface is bounded. Production deployments should ADD
 * per-user/IP limiting at the edge (e.g. a CDN/WAF rule) for finer control.
 */
export const requestChallenge = action({
  args: {},
  returns: v.object({ nonce: v.string(), expiresAt: v.number() }),
  handler: async (ctx): Promise<{ nonce: string; expiresAt: number }> => {
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    await ctx.runMutation(internal.appAttestStore.createChallenge, {
      nonce,
      expiresAt,
    });
    return { nonce, expiresAt };
  },
});

/**
 * Verify a device attestation and persist the resulting key.
 *
 * The challenge is consumed FIRST, before verification: a nonce is single-use
 * regardless of whether verification then succeeds, so an attacker can't retry
 * a failed attestation with the same nonce. That single-use nonce already
 * gates this path, so no extra rate limit is applied here (the nonce supply is
 * itself bounded by the appAttestChallenge limit).
 */
export const verifyAttestation = action({
  args: {
    keyId: v.string(),
    attestation: v.string(),
    challenge: v.string(),
    bundleId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    keyId: v.string(),
    publicKey: v.string(),
    environment: v.union(v.literal("development"), v.literal("production")),
  }),
  handler: async (ctx, args) => {
    const consumed = await ctx.runMutation(
      internal.appAttestStore.consumeChallenge,
      { nonce: args.challenge, now: Date.now() }
    );
    if (!consumed) {
      throw new Error("Challenge is unknown, expired, or already consumed");
    }

    const bundleId = resolveBundleId(args.bundleId);
    const teamId = resolveTeamId(args.teamId);
    const environment = resolveEnvironment();

    const { publicKey } = verifyAttestationBytes({
      keyId: args.keyId,
      attestation: Buffer.from(args.attestation, "base64"),
      challenge: args.challenge,
      bundleId,
      teamId,
      environment,
    });

    await ctx.runMutation(internal.appAttestStore.storeKey, {
      keyId: args.keyId,
      publicKey,
      environment,
      userId: args.userId,
      now: Date.now(),
    });

    return { keyId: args.keyId, publicKey, environment };
  },
});

/**
 * Verify an assertion over a request payload and advance the key's counter.
 * `payload` MUST be the exact string the client signed (the native module
 * hashes its UTF-8 bytes), so client and server agree on the signed bytes.
 */
export const verifyAssertion = action({
  args: {
    keyId: v.string(),
    assertion: v.string(),
    payload: v.string(),
    bundleId: v.optional(v.string()),
    teamId: v.optional(v.string()),
  },
  returns: v.object({ counter: v.number() }),
  handler: async (ctx, args): Promise<{ counter: number }> => {
    const key = await ctx.runQuery(internal.appAttestStore.findKey, {
      keyId: args.keyId,
    });
    if (!key) {
      throw new Error(`Unknown App Attest key: ${args.keyId}`);
    }

    const bundleId = resolveBundleId(args.bundleId);
    const teamId = resolveTeamId(args.teamId);

    const counter = verifyAssertionBytes({
      assertion: Buffer.from(args.assertion, "base64"),
      payload: args.payload,
      bundleId,
      teamId,
      publicKey: Buffer.from(key.publicKey, "base64url"),
      storedCounter: key.counter,
    });

    await ctx.runMutation(internal.appAttestStore.bumpCounter, {
      keyId: args.keyId,
      counter,
    });

    return { counter };
  },
});

/** Whether sensitive server actions require a verified App Attest assertion. */
export function attestationEnforced(): boolean {
  const flag = process.env.APP_ATTEST_ENFORCEMENT;
  return flag === "1" || flag === "true";
}

/**
 * Gate a sensitive operation on a fresh device assertion. No-op when
 * enforcement is off (the default), so protected ops stay cross-platform.
 * When on: requires the assertion args, consumes the single-use challenge
 * (anti-replay), rebuilds the signed payload as `<operation>:<challenge>` so a
 * signature can't be lifted onto a different request, verifies it against the
 * stored key, and advances the monotonic counter.
 */
export async function enforceAttestation(
  ctx: ActionCtx,
  args: {
    keyId?: string;
    assertion?: string;
    challenge?: string;
    operation: string;
  }
): Promise<void> {
  if (!attestationEnforced()) {
    return;
  }
  if (!(args.keyId && args.assertion && args.challenge)) {
    throw new Error("App Attest assertion required for this operation");
  }
  const consumed = await ctx.runMutation(
    internal.appAttestStore.consumeChallenge,
    {
      nonce: args.challenge,
      now: Date.now(),
    }
  );
  if (!consumed) {
    throw new Error(
      "App Attest challenge is unknown, expired, or already used"
    );
  }
  const key = await ctx.runQuery(internal.appAttestStore.findKey, {
    keyId: args.keyId,
  });
  if (!key) {
    throw new Error(`Unknown App Attest key: ${args.keyId}`);
  }
  const counter = verifyAssertionBytes({
    assertion: Buffer.from(args.assertion, "base64"),
    payload: `${args.operation}:${args.challenge}`,
    bundleId: resolveBundleId(),
    teamId: resolveTeamId(),
    publicKey: Buffer.from(key.publicKey, "base64url"),
    storedCounter: key.counter,
  });
  await ctx.runMutation(internal.appAttestStore.bumpCounter, {
    keyId: args.keyId,
    counter,
  });
}
