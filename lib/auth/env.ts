/**
 * Edge-safe auth configuration helpers. Must not import Node-only modules.
 */

export const SESSION_COOKIE_NAME = "awarely_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const DEV_SESSION_SECRET = "awarely-local-dev-secret-please-change";
const DEV_PASSCODE = "awarely";

/**
 * Detects unset values and the placeholder strings shipped in .env.example.
 * Treating these as configured in production would leave the app unlocked with
 * a publicly documented passcode.
 */
export function isTemplateValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("change-me") ||
    normalized.includes("please-change") ||
    normalized.includes("insecure") ||
    normalized.includes("your-project") ||
    normalized.includes("your-service-role") ||
    normalized.includes("your-weatherapi") ||
    normalized === "your-anon-public-key"
  );
}

export function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (secret && secret.length >= 16 && !isTemplateValue(secret)) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SESSION_SECRET;
  return "";
}

export function getPasscode(): string {
  const passcode = process.env.APP_PASSCODE;
  if (passcode && !isTemplateValue(passcode)) return passcode;
  if (process.env.NODE_ENV !== "production") return DEV_PASSCODE;
  return "";
}
