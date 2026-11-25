/**
 * Authentication, session, rate-limit, and error-sanitisation tests.
 */

import {
  getPasscode,
  getSessionSecret,
  isPasscodeCorrect,
  signSessionToken,
} from "@/lib/auth/passcode";
import { verifySessionToken } from "@/lib/auth/token";
import { constantTimeEqual } from "@/lib/auth/compare";
import { FixedWindowRateLimiter } from "@/lib/auth/rate-limit";
import { publicErrorMessage } from "@/lib/api/error";
import { DatabaseNotConfiguredError } from "@/lib/supabase/require-client";

type Result = { test: string; passed: boolean; error?: string };

export async function testAuthSecurity(): Promise<Result[]> {
  const results: Result[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  const secret = "test-session-secret-with-enough-length";

  // Session token round trip.
  const validToken = signSessionToken(secret, 60);
  assert(
    "Valid session token verifies",
    await verifySessionToken(validToken, secret)
  );
  assert(
    "Wrong secret rejects token",
    !(await verifySessionToken(validToken, "different-secret"))
  );
  assert(
    "Malformed token is rejected",
    !(await verifySessionToken("not-a-token", secret))
  );
  assert(
    "Empty token is rejected",
    !(await verifySessionToken(undefined, secret))
  );

  const expiredToken = signSessionToken(secret, -1);
  assert(
    "Expired token is rejected",
    !(await verifySessionToken(expiredToken, secret))
  );

  const tampered = `${validToken.slice(0, -1)}${validToken.endsWith("A") ? "B" : "A"}`;
  assert(
    "Tampered token is rejected",
    !(await verifySessionToken(tampered, secret))
  );

  // Passcode and constant-time helpers.
  assert("Passcode comparison accepts a match", isPasscodeCorrect("abc", "abc"));
  assert(
    "Passcode comparison rejects a mismatch",
    !isPasscodeCorrect("abc", "abd")
  );
  assert(
    "Constant-time comparison accepts a match",
    await constantTimeEqual("secret", "secret")
  );
  assert(
    "Constant-time comparison rejects a mismatch",
    !(await constantTimeEqual("secret", "other"))
  );

  // Fixed-window rate limiter.
  const limiter = new FixedWindowRateLimiter(2, 1_000);
  const now = 1_000;
  assert("New rate-limit key is not limited", !limiter.isLimited("ip", now));
  limiter.recordFailure("ip", now);
  assert(
    "One failure is below the limit",
    !limiter.isLimited("ip", now)
  );
  limiter.recordFailure("ip", now);
  assert("Two failures hit the limit", limiter.isLimited("ip", now));
  assert(
    "Rate limit expires after the window",
    !limiter.isLimited("ip", now + 1_001)
  );
  limiter.recordFailure("ip", now);
  limiter.reset("ip");
  assert("Reset clears the rate limit", !limiter.isLimited("ip", now));

  // Error sanitisation.
  assert(
    "Internal errors are replaced with a fallback",
    publicErrorMessage(new Error("relation public.secret does not exist"), "Safe message") ===
      "Safe message"
  );
  assert(
    "Database configuration errors remain actionable",
    publicErrorMessage(new DatabaseNotConfiguredError(), "Safe message").includes(
      "SUPABASE_URL"
    )
  );

  // Production placeholder hardening.
  const originalEnv = process.env.NODE_ENV;
  const originalPasscode = process.env.APP_PASSCODE;
  const originalSessionSecret = process.env.APP_SESSION_SECRET;
  const env = process.env as Record<string, string | undefined>;
  try {
    env.NODE_ENV = "production";
    env.APP_PASSCODE = "replace-with-a-long-private-passphrase";
    env.APP_SESSION_SECRET = "replace-with-64-hex-characters";
    assert("Template passcode fails closed in production", getPasscode() === "");
    assert(
      "Template session secret fails closed in production",
      getSessionSecret() === ""
    );
  } finally {
    if (originalEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalEnv;
    if (originalPasscode === undefined) delete env.APP_PASSCODE;
    else env.APP_PASSCODE = originalPasscode;
    if (originalSessionSecret === undefined) delete env.APP_SESSION_SECRET;
    else env.APP_SESSION_SECRET = originalSessionSecret;
  }

  return results;
}
