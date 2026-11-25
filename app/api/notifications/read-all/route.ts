import { NextResponse } from "next/server";
import { notificationRepository } from "@/lib/supabase/notifications";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const updated = await notificationRepository.markAllRead();
    return NextResponse.json({ success: true, updated });
  } catch (error: unknown) {
    console.error("[POST /api/notifications/read-all] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to mark notifications as read"),
      },
      { status: 500 }
    );
  }
}
