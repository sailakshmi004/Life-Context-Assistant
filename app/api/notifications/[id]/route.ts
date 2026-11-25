import { NextRequest, NextResponse } from "next/server";
import { notificationRepository } from "@/lib/supabase/notifications";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const payload = (body ?? {}) as { isRead?: unknown; dismissed?: unknown };

  try {
    if (payload.dismissed === true) {
      const ok = await notificationRepository.dismiss(id);
      if (!ok)
        return NextResponse.json(
          { success: false, error: "Notification not found." },
          { status: 404 }
        );
      return NextResponse.json({ success: true });
    }

    if (typeof payload.isRead === "boolean") {
      const ok = await notificationRepository.markRead(id, payload.isRead);
      if (!ok)
        return NextResponse.json(
          { success: false, error: "Notification not found." },
          { status: 404 }
        );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Provide isRead or dismissed." },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error(`[PATCH /api/notifications/${id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to update notification"),
      },
      { status: 500 }
    );
  }
}
