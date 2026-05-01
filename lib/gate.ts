// Edge-runtime safe cookie sign/verify for the dashboard gate.
// Uses Web Crypto (crypto.subtle) so it works in Next.js middleware.

const COOKIE_NAME = "pp_gate";
const SESSION_DAYS = 30;
const ENC = new TextEncoder();

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(message));
  return bytesToHex(sig);
}

/**
 * Constant-time string compare. Avoid early-exit timing leaks on cookie
 * verification. Both inputs must be hex (or any equal-length string).
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Sign a session cookie value. Format: `${expiresAt}.${hmacHex}`.
 * expiresAt is ms since epoch.
 */
export async function signSession(secret: string): Promise<{ value: string; maxAge: number }> {
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 86_400_000;
  const sig = await hmacHex(secret, String(expiresAt));
  return { value: `${expiresAt}.${sig}`, maxAge: SESSION_DAYS * 86_400 };
}

export async function verifySession(secret: string, raw: string | null | undefined): Promise<boolean> {
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expiresAtNum = Number(expiresAt);
  if (!Number.isFinite(expiresAtNum) || expiresAtNum <= Date.now()) return false;
  const expectedSig = await hmacHex(secret, expiresAt);
  return safeEqual(sig, expectedSig);
}

export const GATE_COOKIE = COOKIE_NAME;
