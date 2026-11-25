import { NextRequest, NextResponse } from "next/server";
import { notificationRepository } from "@/lib/supabase/notifications";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const includeDismissed = searchParams.get("includeDismissed") === "1";
    const activityId = searchParams.get("activityId") || undefined;
    const limitRaw = Number(searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
      : 100;

    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.list({
        unreadOnly,
        includeDismissed,
        activityId,
        limit,
      }),
      notificationRepository.countUnread(),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount,
    });
  } catch (error: unknown) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to load notifications"),
      },
      { status: 500 }
    );
  }
}
