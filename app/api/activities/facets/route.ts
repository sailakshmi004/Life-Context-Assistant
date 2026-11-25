import { NextResponse } from "next/server";
import { activityRepository } from "@/lib/supabase/activities";
import { publicErrorMessage } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facets = await activityRepository.getFacets();
    return NextResponse.json({ success: true, data: facets });
  } catch (error: unknown) {
    console.error("[GET /api/activities/facets] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: publicErrorMessage(error, "Failed to load activity facets"),
      },
      { status: 500 }
    );
  }
}
