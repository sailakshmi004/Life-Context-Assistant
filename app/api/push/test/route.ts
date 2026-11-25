import { NextResponse } from "next/server";
import { isPushConfigured, sendPushToAll } from "@/lib/push/server";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
      },
      { status: 503 }
    );
  }

  try {
    const result = await sendPushToAll({
      title: "Awarely test notification",
      body: "Push notifications are working. You will receive weather conflicts and reminders here.",
      url: "/notifications",
      tag: "awarely-test",
    });

    return NextResponse.json({
      success: true,
      data: result,
      message:
        result.attempted === 0
          ? "No subscribed devices found. Enable notifications on this device first."
          : `Sent to ${result.sent} of ${result.attempted} device(s).`,
    });
  } catch (error: unknown) {
    console.error("[POST /api/push/test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to send test notification"),
      },
      { status: 500 }
    );
  }
}
