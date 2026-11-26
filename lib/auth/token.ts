/**
 * Edge-safe session token verification.
 *
 * The token format is `<unixExpirySeconds>.<base64url HMAC-SHA256>` and is
 * signed over the expiry only. This file must stay free of Node-only imports
 * because it is used by `middleware.ts` (Edge runtime).
 */

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token || !secret) return false;

  const [expiryPart, signaturePart] = token.split(".");
  if (!expiryPart || !signaturePart) return false;

  const expiry = Number(expiryPart);
  if (!Number.isFinite(expiry) || expiry * 1000 < Date.now()) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = base64UrlToBytes(signaturePart);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature as unknown as BufferSource,
      encoder.encode(expiryPart)
    );
  } catch {
    return false;
  }
}
