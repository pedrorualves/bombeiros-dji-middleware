import { SESSION } from "@bombeiros/shared";
import type { JWTPayload } from "@bombeiros/shared";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ─── Password Hashing (PBKDF2-SHA256) ───────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(SESSION.PBKDF2_SALT_BYTES)
  );
  const key = await deriveKey(password, salt);
  const hash = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;
  const saltHex = bufToHex(salt);
  const hashHex = bufToHex(new Uint8Array(hash));
  return `pbkdf2:${SESSION.PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts[0] !== "pbkdf2" || parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = hexToBuf(parts[2]);
  const expectedHash = parts[3];

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    256
  );
  const actualHash = bufToHex(new Uint8Array(derived));

  return timingSafeEqual(actualHash, expectedHash);
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: SESSION.PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    256
  );
  return crypto.subtle.importKey("raw", bits, "HMAC", true, ["sign"]);
}

// ─── JWT (HMAC-SHA256, compact serialization) ────────────────────────────────

export async function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION.JWT_EXPIRY_SECONDS,
  };

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;

  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput)
  );

  return `${signingInput}.${bufToBase64url(new Uint8Array(sig))}`;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const signingInput = `${header}.${body}`;

  const key = await importHmacKey(secret);
  const expectedSig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput)
  );

  const actualSig = base64urlToBuf(signature);
  if (!timingSafeEqualBuf(new Uint8Array(expectedSig), actualSig)) return null;

  try {
    const payload: JWTPayload = JSON.parse(
      decoder.decode(base64urlToBuf(body))
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function shouldRenewJWT(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - payload.iat;
  return age >= SESSION.JWT_RENEW_AFTER_SECONDS;
}

// ─── AES-GCM Encryption (for ArcGIS credentials at rest) ────────────────────

export async function encrypt(
  plaintext: string,
  keyHex: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(SESSION.AES_IV_BYTES));
  const key = await importAesKey(keyHex);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  const ivHex = bufToHex(iv);
  const ctHex = bufToHex(new Uint8Array(ciphertext));
  return `aesgcm:${ivHex}:${ctHex}`;
}

export async function decrypt(
  stored: string,
  keyHex: string
): Promise<string> {
  const parts = stored.split(":");
  if (parts[0] !== "aesgcm" || parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  const iv = hexToBuf(parts[1]);
  const ciphertext = hexToBuf(parts[2]);
  const key = await importAesKey(keyHex);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return decoder.decode(plaintext);
}

async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const raw = hexToBuf(keyHex);
  if (raw.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bufToBase64url(buf: Uint8Array): string {
  let binary = "";
  for (const byte of buf) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBuf(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function timingSafeEqualBuf(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
