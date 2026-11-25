import {
  Activity,
  ActivityCategory,
  ActivityFacets,
  ActivityRow,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";
import { requireSupabase, DatabaseNotConfiguredError } from "./require-client";
import { getRuleTypesForActivity } from "@/lib/rules/registry";
import { VALID_CATEGORIES, VALID_STATUSES } from "@/lib/validations/activity";

export { DatabaseNotConfiguredError };


/**
 * Transforms a Supabase database row (snake_case) to an application Activity (camelCase).
 */
export function mapRowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    monitoringEnabled: row.monitoring_enabled,
    status: row.status,
    location: row.location ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contextRule: row.monitoring_enabled ? "weather_rain" : "none",
    ruleTypes: getRuleTypesForActivity({
      title: row.title,
      category: row.category,
    }),
  };
}

export interface ActivityFilterOptions {
  status?: string;
  category?: string;
  search?: string;
}

export const activityRepository = {
  /**
   * Fetches all activities from Supabase, optionally filtered.
   */
  async getAll(filters: ActivityFilterOptions = {}): Promise<{
    activities: Activity[];
    isLiveSupabase: boolean;
  }> {
    const supabase = requireSupabase();

    let query = supabase
      .from("activities")
      .select("*")
      .order("start_time", { ascending: true });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category) query = query.eq("category", filters.category);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch activities: ${error.message}`);

    let results = ((data ?? []) as ActivityRow[]).map(mapRowToActivity);
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(needle) ||
          a.description?.toLowerCase().includes(needle) ||
          a.location?.toLowerCase().includes(needle)
      );
    }

    return { activities: results, isLiveSupabase: true };
  },

  /**
   * Returns counts by category and status for the current activity list.
   * Small single-user dataset, so aggregation in JS keeps the query simple.
   */
  async getFacets(): Promise<ActivityFacets> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("activities")
      .select("category,status");

    if (error) throw new Error(`Failed to load activity facets: ${error.message}`);

    const categories = Object.fromEntries(
      VALID_CATEGORIES.map((category) => [category, 0])
    ) as Record<ActivityCategory, number>;
    const statuses = Object.fromEntries(
      VALID_STATUSES.map((status) => [status, 0])
    ) as Record<ActivityStatus, number>;

    const rows = (data ?? []) as Pick<ActivityRow, "category" | "status">[];
    for (const row of rows) {
      if (row.category in categories) categories[row.category] += 1;
      if (row.status in statuses) statuses[row.status] += 1;
    }

    return { total: rows.length, categories, statuses };
  },

  /**
   * Fetches a single activity by its ID.
   */
  async getById(id: string): Promise<Activity | null> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch activity: ${error.message}`);
    return data ? mapRowToActivity(data as ActivityRow) : null;
  },

  /**
   * Creates a new activity.
   */
  async create(input: CreateActivityInput): Promise<{
    activity: Activity;
    isLiveSupabase: boolean;
  }> {
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("activities")
      .insert({
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        start_time: input.startTime,
        duration_minutes: input.durationMinutes,
        monitoring_enabled: input.monitoringEnabled ?? true,
        status: input.status ?? "pending",
        location: input.location ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create activity: ${error.message}`);

    return {
      activity: mapRowToActivity(data as ActivityRow),
      isLiveSupabase: true,
    };
  },

  /**
   * Partially updates an activity by ID.
   */
  async update(
    id: string,
    input: UpdateActivityInput
  ): Promise<Activity | null> {
    const supabase = requireSupabase();

    const updatePayload: Record<string, unknown> = {};
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined)
      updatePayload.description = input.description;
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.startTime !== undefined)
      updatePayload.start_time = input.startTime;
    if (input.durationMinutes !== undefined)
      updatePayload.duration_minutes = input.durationMinutes;
    if (input.monitoringEnabled !== undefined)
      updatePayload.monitoring_enabled = input.monitoringEnabled;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.location !== undefined) updatePayload.location = input.location;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("activities")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to update activity: ${error.message}`);
    return data ? mapRowToActivity(data as ActivityRow) : null;
  },

  /**
   * Deletes an activity by ID.
   */
  async delete(id: string): Promise<boolean> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("activities")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Failed to delete activity: ${error.message}`);
    return Boolean(data && data.length > 0);
  },
};
