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

async function isCronRequest(request: NextRequest): Promise<boolean> {
  if (request.nextUrl.pathname !== "/api/notifications/sync") return false;
  const header = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || isTemplateValue(expected) || !header) return false;
  return constantTimeEqual(header, expected);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    getSessionSecret()
  );

  if (authenticated) {
    if (pathname === "/unlock") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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

  const unlockUrl = new URL("/unlock", request.url);
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
