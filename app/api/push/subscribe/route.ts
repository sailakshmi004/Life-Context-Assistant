import { NextRequest, NextResponse } from "next/server";
import { requireSupabase } from "@/lib/supabase/require-client";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscriptionBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

export async function POST(request: NextRequest) {
  let body: SubscriptionBody;
  try {
    body = (await request.json()) as SubscriptionBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh =
    typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { success: false, error: "A valid push subscription is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = requireSupabase();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get("user-agent"),
      },
      { onConflict: "endpoint" }
    );

    if (error)
      return NextResponse.json(
        {
          success: false,
          error: publicErrorMessage(error, "Failed to save subscription."),
        },
        { status: 500 }
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(err, "Failed to save subscription."),
      },
      { status: 500 }
    );
  }
}
