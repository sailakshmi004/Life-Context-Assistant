import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getPasscode,
  getSessionSecret,
  isPasscodeCorrect,
  signSessionToken,
} from "@/lib/auth/passcode";
import { FixedWindowRateLimiter } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const unlockLimiter = new FixedWindowRateLimiter(MAX_ATTEMPTS, WINDOW_MS);

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const passcode = getPasscode();
  const secret = getSessionSecret();

  if (!passcode || !secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Server is not configured. Set APP_PASSCODE and APP_SESSION_SECRET environment variables.",
      },
      { status: 503 }
    );
  }

  const key = getClientKey(request);
  if (unlockLimiter.isLimited(key)) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const candidate =
    typeof body === "object" && body !== null && "passcode" in body
      ? String((body as { passcode: unknown }).passcode ?? "")
      : "";

  if (!isPasscodeCorrect(candidate, passcode)) {
    unlockLimiter.recordFailure(key);
    return NextResponse.json(
      { success: false, error: "Incorrect passcode." },
      { status: 401 }
    );
  }

  unlockLimiter.reset(key);
  const token = signSessionToken(secret, SESSION_TTL_SECONDS);
  const response = NextResponse.json({ success: true });

  // Derive Secure from the actual request so the app also works over plain
  // HTTP on a LAN (where browsers refuse Secure cookies) while still using
  // Secure cookies behind Caddy/HTTPS in production.
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:";

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
