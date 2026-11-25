import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth/request";
import { syncNotifications } from "@/lib/notifications/sync";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/sync
 *
 * Idempotent. Called by the dashboard after data changes and by the scheduler
 * container every 10 minutes (authenticated with x-cron-secret).
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthorizedRequest(request))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await syncNotifications();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("[POST /api/notifications/sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to sync notifications"),
      },
      { status: 500 }
    );
  }
}
