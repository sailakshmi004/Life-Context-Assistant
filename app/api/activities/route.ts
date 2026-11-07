import { NextRequest, NextResponse } from "next/server";
import { activityRepository } from "@/lib/supabase/activities";
import { validateCreateActivityInput } from "@/lib/validations/activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/activities
 * Fetches all activities, supporting optional filtering by status and category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const { activities, isLiveSupabase } = await activityRepository.getAll({
      status,
      category,
      search,
    });

    return NextResponse.json(
      {
        success: true,
        data: activities,
        count: activities.length,
        isLiveSupabase,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/activities] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch activities";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities
 * Creates a new activity with payload validation.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate payload
    const validation = validateCreateActivityInput(body);
    if (!validation.isValid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { activity, isLiveSupabase } = await activityRepository.create(
      validation.data
    );

    return NextResponse.json(
      {
        success: true,
        data: activity,
        isLiveSupabase,
        message: "Activity created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/activities] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create activity";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
