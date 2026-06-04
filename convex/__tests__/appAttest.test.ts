/** @jest-environment node */
//
// The "convex" Jest project defaults to @edge-runtime/jest-environment, which
// lacks Node's X509Certificate / createPublicKey. This per-file docblock
// overrides it to the Node environment so the crypto verifier resolves. The
// crypto sanity check below fails loudly if that override ever stops working.

import { X509Certificate } from "node:crypto";
import { encode } from "cbor-x";

import type { ActionCtx } from "../_generated/server";
import {
  aaguidMatches,
  attestationEnforced,
  encodeOid,
  enforceAttestation,
  extractAppleNonceExtension,
  parseAuthData,
  readDerLength,
  sha256,
  timingSafeEqual,
  verifyAssertionBytes,
  verifyAttestationBytes,
} from "../appAttest";

const FORMAT_RE = /format/;
const CERT_CHAIN_RE = /certificate chain/;
const AUTH_DATA_RE = /authData/;
const SIGNATURE_RE = /signature/;
const AUTHENTICATOR_DATA_RE = /authenticatorData/;
const NONCE_NOT_FOUND_RE = /not found/;

describe("node environment", () => {
  test("node:crypto X509Certificate is available (docblock works)", () => {
    expect(typeof X509Certificate).toBe("function");
  });
});

describe("encodeOid", () => {
  test("encodes Apple's nonce OID 1.2.840.113635.100.8.2", () => {
    // 1.2 -> 0x2a; 840 -> 0x86 0x48; 113635 -> 0x86 0xf7 0x63; 100 -> 0x64;
    // 8 -> 0x08; 2 -> 0x02.
    expect([...encodeOid("1.2.840.113635.100.8.2")]).toEqual([
      0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x08, 0x02,
    ]);
  });

  test("packs the first two arcs into one byte", () => {
    expect([...encodeOid("1.3.6.1")]).toEqual([0x2b, 0x06, 0x01]);
  });

  test("rejects a malformed OID", () => {
    expect(() => encodeOid("1")).toThrow();
  });
});

describe("readDerLength", () => {
  test("short form (high bit clear)", () => {
    const buf = Buffer.from([0x20]);
    expect(readDerLength(buf, 0)).toEqual({ length: 0x20, next: 1 });
  });

  test("long form (two length bytes)", () => {
    // 0x82 => two following bytes; 0x01 0x2c => 300.
    const buf = Buffer.from([0x82, 0x01, 0x2c]);
    expect(readDerLength(buf, 0)).toEqual({ length: 300, next: 3 });
  });

  test("rejects indefinite length (0x80)", () => {
    expect(() => readDerLength(Buffer.from([0x80]), 0)).toThrow();
  });
});

describe("timingSafeEqual", () => {
  test("true for equal buffers, false for differing ones", () => {
    expect(timingSafeEqual(Buffer.from("abc"), Buffer.from("abc"))).toBe(true);
    expect(timingSafeEqual(Buffer.from("abc"), Buffer.from("abd"))).toBe(false);
  });

  test("false (no throw) on length mismatch", () => {
    expect(timingSafeEqual(Buffer.from("ab"), Buffer.from("abc"))).toBe(false);
  });
});

describe("parseAuthData", () => {
  // Build a synthetic authData with the attested-credential block.
  function buildAttestationAuthData(opts: {
    counter: number;
    aaguid: Buffer;
    credId: Buffer;
    pubKey: Buffer;
  }): Buffer {
    const head = Buffer.alloc(37);
    head.fill(0xaa, 0, 32); // rpIdHash
    head[32] = 0x45; // flags
    head.writeUInt32BE(opts.counter, 33);
    const credIdLen = Buffer.alloc(2);
    credIdLen.writeUInt16BE(opts.credId.length, 0);
    return Buffer.concat([
      head,
      opts.aaguid,
      credIdLen,
      opts.credId,
      opts.pubKey,
    ]);
  }

  test("reads field offsets for an attestation buffer", () => {
    const aaguid = Buffer.from("appattestdevelop");
    const credId = Buffer.from("creds-here-1234567890");
    const pubKey = Buffer.from("public-key-bytes");
    const buf = buildAttestationAuthData({
      counter: 0,
      aaguid,
      credId,
      pubKey,
    });

    const parsed = parseAuthData(buf, true);
    expect(parsed.counter).toBe(0);
    expect(parsed.flags).toBe(0x45);
    expect(timingSafeEqual(parsed.rpIdHash, Buffer.alloc(32, 0xaa))).toBe(true);
    expect(timingSafeEqual(parsed.aaguid, aaguid)).toBe(true);
    expect(timingSafeEqual(parsed.credentialId, credId)).toBe(true);
    expect(timingSafeEqual(parsed.credentialPublicKey, pubKey)).toBe(true);
  });

  test("reads counter for an assertion buffer (no credential block)", () => {
    const buf = Buffer.alloc(37);
    buf.writeUInt32BE(42, 33);
    const parsed = parseAuthData(buf, false);
    expect(parsed.counter).toBe(42);
    expect(parsed.credentialId).toHaveLength(0);
  });

  test("throws when the buffer is too short", () => {
    expect(() => parseAuthData(Buffer.alloc(10), false)).toThrow();
    expect(() => parseAuthData(Buffer.alloc(40), true)).toThrow();
  });

  test("throws when the credential id length runs past the buffer", () => {
    const buf = Buffer.alloc(55);
    buf.writeUInt16BE(100, 53); // claims 100 bytes of credId that don't exist
    expect(() => parseAuthData(buf, true)).toThrow();
  });
});

describe("aaguidMatches", () => {
  // Mirror the AAGUID bytes Apple writes into authData (kept module-private in
  // the verifier): prod is "appattest" + 7 NUL, dev is "appattestdevelop".
  const prodAaguid = Buffer.concat([Buffer.from("appattest"), Buffer.alloc(7)]);
  const devAaguid = Buffer.from("appattestdevelop");

  test("production accepts the production AAGUID", () => {
    expect(aaguidMatches(prodAaguid, "production")).toBe(true);
  });

  test("production REJECTS the development AAGUID", () => {
    // Security-critical: a dev build must never attest against a prod backend.
    expect(aaguidMatches(devAaguid, "production")).toBe(false);
  });

  test("development accepts the development AAGUID", () => {
    expect(aaguidMatches(devAaguid, "development")).toBe(true);
  });

  test("development also accepts the production AAGUID", () => {
    // The prod AAGUID is always accepted; only the dev one is environment-gated.
    expect(aaguidMatches(prodAaguid, "development")).toBe(true);
  });

  test("rejects an unrelated AAGUID in either environment", () => {
    const bogus = Buffer.alloc(16, 0x7a);
    expect(aaguidMatches(bogus, "production")).toBe(false);
    expect(aaguidMatches(bogus, "development")).toBe(false);
  });
});

describe("extractAppleNonceExtension", () => {
  const APPLE_NONCE_OID = "1.2.840.113635.100.8.2";

  // Wrap content in a DER TLV with short-form length (< 128 bytes is enough
  // for these synthetic blobs).
  function tlv(tag: number, content: Buffer): Buffer {
    if (content.length >= 0x80) {
      throw new Error("test helper only supports short-form DER lengths");
    }
    return Buffer.concat([Buffer.from([tag, content.length]), content]);
  }

  // Build the exact nesting the extractor walks: OID, then extnValue OCTET
  // STRING wrapping SEQUENCE { [1] OCTET STRING <nonce> }.
  function buildCertDer(oid: string, nonce: Buffer): Buffer {
    const oidTlv = tlv(0x06, encodeOid(oid));
    const nonceOctet = tlv(0x04, nonce);
    const ctxTag = tlv(0xa1, nonceOctet);
    const innerSeq = tlv(0x30, ctxTag);
    const extnValue = tlv(0x04, innerSeq);
    // Prefix some unrelated bytes to prove indexOf-based location works.
    return Buffer.concat([
      Buffer.from([0x30, 0x05, 0xde, 0xad, 0xbe, 0xef, 0x00]),
      oidTlv,
      extnValue,
    ]);
  }

  test("extracts exactly the nonce bytes wrapped by the Apple OID", () => {
    const nonce = Buffer.from("0123456789abcdef0123456789abcdef");
    const der = buildCertDer(APPLE_NONCE_OID, nonce);
    expect(timingSafeEqual(extractAppleNonceExtension(der), nonce)).toBe(true);
  });

  test("throws when the Apple nonce OID is absent", () => {
    // Same structure but under a different OID, so indexOf misses it.
    const der = buildCertDer("1.2.840.113635.100.8.3", Buffer.alloc(32, 0x11));
    expect(() => extractAppleNonceExtension(der)).toThrow(NONCE_NOT_FOUND_RE);
  });
});

describe("verifyAttestationBytes failure paths", () => {
  const baseArgs = {
    keyId: "key",
    challenge: "challenge",
    bundleId: "com.example.app",
    teamId: "TEAMID1234",
    environment: "development" as const,
  };

  test("throws on an unexpected fmt", () => {
    const attestation = encode({
      fmt: "android-key",
      attStmt: { x5c: [Buffer.from("a"), Buffer.from("b")] },
      authData: Buffer.alloc(37),
    });
    expect(() => verifyAttestationBytes({ ...baseArgs, attestation })).toThrow(
      FORMAT_RE
    );
  });

  test("throws when the certificate chain is missing or too short", () => {
    const attestation = encode({
      fmt: "apple-appattest",
      attStmt: { x5c: [Buffer.from("only-one")] },
      authData: Buffer.alloc(37),
    });
    expect(() => verifyAttestationBytes({ ...baseArgs, attestation })).toThrow(
      CERT_CHAIN_RE
    );
  });

  test("throws when authData is missing", () => {
    const attestation = encode({
      fmt: "apple-appattest",
      attStmt: { x5c: [Buffer.from("a"), Buffer.from("b")] },
    });
    expect(() => verifyAttestationBytes({ ...baseArgs, attestation })).toThrow(
      AUTH_DATA_RE
    );
  });
});

describe("verifyAssertionBytes failure paths", () => {
  const baseArgs = {
    payload: "payload",
    bundleId: "com.example.app",
    teamId: "TEAMID1234",
    publicKey: Buffer.alloc(0),
    storedCounter: 0,
  };

  test("throws when the signature is missing", () => {
    const assertion = encode({ authenticatorData: Buffer.alloc(37) });
    expect(() => verifyAssertionBytes({ ...baseArgs, assertion })).toThrow(
      SIGNATURE_RE
    );
  });

  test("throws when authenticatorData is missing", () => {
    const assertion = encode({ signature: Buffer.from("sig") });
    expect(() => verifyAssertionBytes({ ...baseArgs, assertion })).toThrow(
      AUTHENTICATOR_DATA_RE
    );
  });
});

describe("sha256", () => {
  test("matches a known vector and concatenates parts", () => {
    // sha256("") = e3b0c442...
    expect(sha256(Buffer.alloc(0)).toString("hex")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    // sha256("ab") === sha256("a" || "b").
    expect(sha256(Buffer.from("a"), Buffer.from("b"))).toEqual(
      sha256(Buffer.from("ab"))
    );
  });
});

describe("attestationEnforced", () => {
  // Save/restore via delete (not assignment): setting process.env.X = undefined
  // stores the literal string "undefined", which would read back as truthy.
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.APP_ATTEST_ENFORCEMENT;
    delete process.env.APP_ATTEST_ENFORCEMENT;
  });
  afterEach(() => {
    if (saved === undefined) {
      delete process.env.APP_ATTEST_ENFORCEMENT;
    } else {
      process.env.APP_ATTEST_ENFORCEMENT = saved;
    }
  });

  test("is false when the flag is unset", () => {
    expect(attestationEnforced()).toBe(false);
  });

  test('is true for "1" and "true", false for other values', () => {
    process.env.APP_ATTEST_ENFORCEMENT = "1";
    expect(attestationEnforced()).toBe(true);
    process.env.APP_ATTEST_ENFORCEMENT = "true";
    expect(attestationEnforced()).toBe(true);
    process.env.APP_ATTEST_ENFORCEMENT = "0";
    expect(attestationEnforced()).toBe(false);
    process.env.APP_ATTEST_ENFORCEMENT = "yes";
    expect(attestationEnforced()).toBe(false);
  });

  test("enforceAttestation is a no-op when enforcement is off (never touches ctx)", async () => {
    delete process.env.APP_ATTEST_ENFORCEMENT;
    // A throwing stub proves the early return fires before any ctx access.
    const ctx = {
      runMutation: () => {
        throw new Error("ctx must not be used when enforcement is off");
      },
      runQuery: () => {
        throw new Error("ctx must not be used when enforcement is off");
      },
    } as unknown as ActionCtx;

    await expect(
      enforceAttestation(ctx, { operation: "deleteAccount" })
    ).resolves.toBeUndefined();
  });
});
