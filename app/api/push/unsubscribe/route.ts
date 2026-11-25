import { NextRequest, NextResponse } from "next/server";
import { requireSupabase } from "@/lib/supabase/require-client";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const endpoint =
    typeof body === "object" && body !== null && "endpoint" in body
      ? String((body as { endpoint: unknown }).endpoint ?? "")
      : "";

  if (!endpoint) {
    return NextResponse.json(
      { success: false, error: "Endpoint is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = requireSupabase();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error)
      return NextResponse.json(
        {
          success: false,
          error: publicErrorMessage(error, "Failed to remove subscription."),
        },
        { status: 500 }
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(err, "Failed to remove subscription."),
      },
      { status: 500 }
    );
  }
}
