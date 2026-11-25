import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Push notifications are not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, publicKey });
}
