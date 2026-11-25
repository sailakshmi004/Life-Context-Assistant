import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getPasscode,
  getSessionSecret,
  isTemplateValue,
} from "./env";

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, getPasscode, getSessionSecret };

export function signSessionToken(
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac("sha256", secret)
    .update(String(expiry))
    .digest("base64url");
  return `${expiry}.${signature}`;
}

/**
 * Constant-time comparison that does not leak the passcode length.
 */
export function isPasscodeCorrect(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function isValidCronSecret(candidate: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || isTemplateValue(expected) || !candidate) return false;
  return isPasscodeCorrect(candidate, expected);
}
