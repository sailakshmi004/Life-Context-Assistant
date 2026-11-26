import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/token";
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  isTemplateValue,
} from "@/lib/auth/env";
import { constantTimeEqual } from "@/lib/auth/compare";

/**
 * Paths that remain reachable without a session. Everything else — including
 * every `/api/*` route — requires the signed passcode cookie.
 */
const PUBLIC_PATHS = new Set([
  "/unlock",
  "/api/auth/unlock",
  "/api/health",
  "/sw.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/icon.svg",
  "/apple-icon.svg",
  "/favicon.ico",
]);

function getRequestOrigin(request: NextRequest): string {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    return `${forwardedProto || "http"}://${host}`;
  }
  return request.nextUrl.origin;
}

async function isCronRequest(request: NextRequest): Promise<boolean> {
  if (request.nextUrl.pathname !== "/api/notifications/sync") return false;
  const header = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || isTemplateValue(expected) || !header) return false;
  return constantTimeEqual(header, expected);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = getSessionSecret();
  const authenticated = await verifySessionToken(token, secret);

  if (authenticated) {
    if (pathname === "/unlock") {
      return NextResponse.redirect(new URL("/dashboard", getRequestOrigin(request)));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname) || (await isCronRequest(request))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Enter the app passcode first." },
      { status: 401 }
    );
  }

  const unlockUrl = new URL("/unlock", getRequestOrigin(request));
  const nextPath = `${pathname}${search}`;
  if (nextPath && nextPath !== "/" && !nextPath.startsWith("//")) {
    unlockUrl.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  // Everything except Next.js internals. Public assets are allow-listed in code.
  matcher: ["/((?!_next).*)"],
};
