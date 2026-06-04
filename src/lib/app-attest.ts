/**
 * Apple App Attest client helpers (iOS-only).
 *
 * Opt-in, per-request anti-abuse: a device generates a Secure Enclave key once
 * (attestation), then signs individual sensitive requests with it (assertion).
 * Public reads stay cheap — only the surfaces you choose to protect pay the
 * round-trip of fetching a challenge, signing, and server-side verification.
 *
 * The transport is abstracted behind `AppAttestClient` so this module never
 * imports the Convex client directly; `createAppAttestClient` binds it to the
 * generated public actions. Every helper guards on platform support and
 * throws on unsupported platforms (Simulator, iOS < 14, non-iOS).
 */

import * as AppIntegrity from "@expo/app-integrity";
import { api } from "convex/_generated/api";
import type { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Generalized, app-namespaced storage key for the attested keyId. SecureStore
// keys must be alphanumeric plus ".", "-", "_".
const KEY_ID_STORAGE_KEY = "expo-forge.app-attest.key-id";

/** True when App Attest is usable: iOS with a Secure Enclave (not Simulator). */
export function supportsAppAttest(): boolean {
  return Platform.OS === "ios" && AppIntegrity.isSupported;
}

// In-memory cache so repeated assertions in one session skip the SecureStore
// read. Populated from SecureStore on first access and on attestation.
let cachedKeyId: string | null = null;

async function loadKeyId(): Promise<string | null> {
  if (cachedKeyId) {
    return cachedKeyId;
  }
  cachedKeyId = await SecureStore.getItemAsync(KEY_ID_STORAGE_KEY);
  return cachedKeyId;
}

async function persistKeyId(keyId: string): Promise<void> {
  cachedKeyId = keyId;
  await SecureStore.setItemAsync(KEY_ID_STORAGE_KEY, keyId);
}

/** The server transport an App Attest flow needs. */
export interface AppAttestClient {
  issueChallenge(): Promise<{ nonce: string; expiresAt: number }>;
  verifyAttestation(args: {
    keyId: string;
    attestation: string;
    challenge: string;
  }): Promise<{ keyId: string; publicKey: string; environment: string }>;
  verifyAssertion(args: {
    keyId: string;
    assertion: string;
    payload: string;
  }): Promise<{ counter: number }>;
}

function assertSupported(): void {
  if (!supportsAppAttest()) {
    throw new Error("App Attest is not supported on this platform");
  }
}

/**
 * Attest this device: generate a Secure Enclave key, attest it against a
 * server challenge, and have the server verify + store the key. Returns the
 * attested keyId, also cached locally for subsequent assertions.
 *
 * The native module computes `clientDataHash = sha256(utf8(nonce))`, so the
 * raw nonce string is passed straight through to `attestKeyAsync` and the
 * server hashes the same string.
 */
export async function attestThisDevice(
  client: AppAttestClient
): Promise<string> {
  assertSupported();
  const { nonce } = await client.issueChallenge();
  const keyId = await AppIntegrity.generateKeyAsync();
  const attestation = await AppIntegrity.attestKeyAsync(keyId, nonce);
  await client.verifyAttestation({ keyId, attestation, challenge: nonce });
  await persistKeyId(keyId);
  return keyId;
}

/**
 * Sign a sensitive request payload with the attested key and have the server
 * verify the assertion. The device must already be attested (call
 * `attestThisDevice` first).
 *
 * `payload` is the exact string signed and verified. The native module hashes
 * its UTF-8 bytes, so the same string must reach the server's `verifyAssertion`
 * — bind a fresh server nonce into the payload to make each signature
 * single-use.
 */
export async function signRequest(
  client: AppAttestClient,
  payload: string
): Promise<{ counter: number }> {
  assertSupported();
  const keyId = await loadKeyId();
  if (!keyId) {
    throw new Error("Device is not attested; call attestThisDevice first");
  }
  const assertion = await AppIntegrity.generateAssertionAsync(keyId, payload);
  return await client.verifyAssertion({ keyId, assertion, payload });
}

/**
 * Build App Attest arguments for a protected server action, or null on
 * platforms that can't attest (non-iOS, Simulator). Attests the device on
 * first use, then signs `<operation>:<challenge>` — the exact string the
 * server rebuilds from the same operation + challenge, so the signature is
 * bound to this request and can't be lifted onto another. Returns null rather
 * than throwing on unsupported platforms so callers can fall back to an
 * unattested call; the server decides whether to require it.
 */
export async function buildAttestation(
  client: AppAttestClient,
  operation: string
): Promise<{ keyId: string; assertion: string; challenge: string } | null> {
  if (!supportsAppAttest()) {
    return null;
  }
  let keyId = await loadKeyId();
  if (!keyId) {
    keyId = await attestThisDevice(client);
  }
  const { nonce } = await client.issueChallenge();
  const assertion = await AppIntegrity.generateAssertionAsync(
    keyId,
    `${operation}:${nonce}`
  );
  return { keyId, assertion, challenge: nonce };
}

/**
 * Bind the `AppAttestClient` transport to the app's Convex client and the
 * generated public actions, so a consumer can run
 * `attestThisDevice(createAppAttestClient(convex))`.
 */
export function createAppAttestClient(
  convex: ConvexReactClient
): AppAttestClient {
  return {
    issueChallenge: () => convex.action(api.appAttest.requestChallenge, {}),
    verifyAttestation: (args) =>
      convex.action(api.appAttest.verifyAttestation, args),
    verifyAssertion: (args) =>
      convex.action(api.appAttest.verifyAssertion, args),
  };
}
