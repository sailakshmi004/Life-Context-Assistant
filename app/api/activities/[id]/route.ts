import { NextRequest, NextResponse } from "next/server";
import { activityRepository } from "@/lib/supabase/activities";
import { validateUpdateActivityInput } from "@/lib/validations/activity";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/activities/[id]
 * Fetches a single activity by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid activity ID" },
        { status: 400 }
      );
    }

    const activity = await activityRepository.getById(id);
    if (!activity) {
      return NextResponse.json(
        { success: false, error: `Activity with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: activity },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[GET /api/activities/${params.id}] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/activities/[id]
 * Partially updates an existing activity.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid activity ID" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate partial update
    const validation = validateUpdateActivityInput(body);
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

    const updated = await activityRepository.update(id, validation.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Activity with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: "Activity updated successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[PATCH /api/activities/${params.id}] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Failed to update activity";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]
 * Deletes an activity by ID.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid activity ID" },
        { status: 400 }
      );
    }

    const deleted = await activityRepository.delete(id);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Activity with ID '${id}' not found or already deleted`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Activity deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[DELETE /api/activities/${params.id}] Error:`, error);
    const message =
      error instanceof Error ? error.message : "Failed to delete activity";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
