import { NextRequest, NextResponse } from "next/server";
import { settingsRepository } from "@/lib/supabase/settings";
import { isPushConfigured } from "@/lib/push/server";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await settingsRepository.get();
    return NextResponse.json({
      success: true,
      data: settings,
      pushConfigured: isPushConfigured(),
    });
  } catch (error: unknown) {
    console.error("[GET /api/settings] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to load settings"),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, error: "A settings object is required." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;
  const update: {
    defaultLocation?: string;
    notificationsEnabled?: boolean;
    pushEnabled?: boolean;
  } = {};

  if (raw.defaultLocation !== undefined) {
    if (
      typeof raw.defaultLocation !== "string" ||
      raw.defaultLocation.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Default location is required." },
        { status: 400 }
      );
    }
    if (raw.defaultLocation.trim().length > 120) {
      return NextResponse.json(
        { success: false, error: "Default location is too long." },
        { status: 400 }
      );
    }
    update.defaultLocation = raw.defaultLocation.trim();
  }

  if (raw.notificationsEnabled !== undefined) {
    if (typeof raw.notificationsEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "notificationsEnabled must be a boolean." },
        { status: 400 }
      );
    }
    update.notificationsEnabled = raw.notificationsEnabled;
  }

  if (raw.pushEnabled !== undefined) {
    if (typeof raw.pushEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "pushEnabled must be a boolean." },
        { status: 400 }
      );
    }
    update.pushEnabled = raw.pushEnabled;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid settings provided." },
      { status: 400 }
    );
  }

  try {
    const settings = await settingsRepository.update(update);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("[PATCH /api/settings] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to update settings"),
      },
      { status: 500 }
    );
  }
}
