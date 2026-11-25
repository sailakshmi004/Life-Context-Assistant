import type { NextRequest } from "next/server";
import { verifySessionToken } from "./token";
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  isValidCronSecret,
} from "./passcode";

/**
 * Server-side authorization check for route handlers that may be invoked by
 * either the browser (session cookie) or the scheduler (cron secret).
 */
export async function isAuthorizedRequest(
  request: NextRequest
): Promise<boolean> {
  if (isValidCronSecret(request.headers.get("x-cron-secret"))) return true;
  return verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    getSessionSecret()
  );
}
