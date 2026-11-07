import {
  Activity,
  ActivityCategory,
  ActivityRow,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";
import { getSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./client";

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Context rule display mapping for Awarely UI
    contextRule: row.monitoring_enabled ? "weather_rain" : "none",
    weatherAlertTriggered:
      row.monitoring_enabled &&
      (row.category === "household" || row.category === "outdoor") &&
      row.status !== "completed",
  };
}

// In-Memory store for when Supabase credentials are not configured (Phase 2 preview fallback)
let inMemoryStore: ActivityRow[] = [
  {
    id: "e4a2d3c1-7b8f-4a9e-8c1d-1a2b3c4d5e6f",
    title: "Drying Clothes",
    description: "Hang laundry outdoors on the backyard line",
    category: "household",
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 120,
    monitoring_enabled: true,
    status: "pending",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "f5b3e4d2-8c9a-5b0f-9d2e-2b3c4d5e6f7a",
    title: "Morning 5K Jog",
    description: "Cardio run around the park loop",
    category: "fitness",
    start_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 45,
    monitoring_enabled: false,
    status: "completed",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a1c2e3d4-9d0b-6c1a-0e3f-3c4d5e6f7a8b",
    title: "Hand-Wash Car",
    description: "Wash and wax vehicle in driveway",
    category: "outdoor",
    start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    monitoring_enabled: true,
    status: "pending",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b2d3f4e5-0e1c-7d2b-1f4a-4d5e6f7a8b9c",
    title: "Water Garden Plants",
    description: "Soak raised beds and potted herbs",
    category: "household",
    start_time: new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 30,
    monitoring_enabled: true,
    status: "pending",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c3e4a5f6-1f2d-8e3c-2a5b-5e6f7a8b9c0d",
    title: "Weekly Planning & Context Review",
    description: "Review calendar and context-sensitive task schedules",
    category: "work",
    start_time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 40,
    monitoring_enabled: false,
    status: "pending",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

export interface ActivityFilterOptions {
  status?: string;
  category?: string;
  search?: string;
}

export const activityRepository = {
  /**
   * Fetches all activities from Supabase (or fallback in-memory store)
   */
  async getAll(filters: ActivityFilterOptions = {}): Promise<{
    activities: Activity[];
    isLiveSupabase: boolean;
  }> {
    const supabase = getSupabaseServerClient();

    if (supabase && isSupabaseConfigured()) {
      let query = supabase
        .from("activities")
        .select("*")
        .order("start_time", { ascending: true });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[activityRepository.getAll] Supabase error:", error);
        throw new Error(error.message);
      }

      let results = (data as ActivityRow[]).map(mapRowToActivity);
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (a) =>
            a.title.toLowerCase().includes(searchLower) ||
            a.description?.toLowerCase().includes(searchLower)
        );
      }

      return { activities: results, isLiveSupabase: true };
    }

    // In-memory fallback
    let rows = [...inMemoryStore];
    if (filters.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters.category) {
      rows = rows.filter((r) => r.category === filters.category);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    rows.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return {
      activities: rows.map(mapRowToActivity),
      isLiveSupabase: false,
    };
  },

  /**
   * Fetches a single activity by its ID
   */
  async getById(id: string): Promise<Activity | null> {
    const supabase = getSupabaseServerClient();

    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[activityRepository.getById] Supabase error:", error);
        throw new Error(error.message);
      }

      return data ? mapRowToActivity(data as ActivityRow) : null;
    }

    // In-memory fallback
    const found = inMemoryStore.find((r) => r.id === id);
    return found ? mapRowToActivity(found) : null;
  },

  /**
   * Creates a new activity in Supabase
   */
  async create(input: CreateActivityInput): Promise<{
    activity: Activity;
    isLiveSupabase: boolean;
  }> {
    const supabase = getSupabaseServerClient();

    if (supabase && isSupabaseConfigured()) {
      const insertPayload = {
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        start_time: input.startTime,
        duration_minutes: input.durationMinutes,
        monitoring_enabled: input.monitoringEnabled ?? true,
        status: input.status ?? "pending",
      };

      const { data, error } = await supabase
        .from("activities")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("[activityRepository.create] Supabase error:", error);
        throw new Error(error.message);
      }

      return {
        activity: mapRowToActivity(data as ActivityRow),
        isLiveSupabase: true,
      };
    }

    // In-memory fallback
    const nowIso = new Date().toISOString();
    const newRow: ActivityRow = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      start_time: input.startTime,
      duration_minutes: input.durationMinutes,
      monitoring_enabled: input.monitoringEnabled ?? true,
      status: input.status ?? "pending",
      created_at: nowIso,
      updated_at: nowIso,
    };

    inMemoryStore.unshift(newRow);

    return {
      activity: mapRowToActivity(newRow),
      isLiveSupabase: false,
    };
  },

  /**
   * Partially updates an activity by ID
   */
  async update(
    id: string,
    input: UpdateActivityInput
  ): Promise<Activity | null> {
    const supabase = getSupabaseServerClient();

    if (supabase && isSupabaseConfigured()) {
      const updatePayload: Record<string, unknown> = {};
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.description !== undefined)
        updatePayload.description = input.description;
      if (input.category !== undefined)
        updatePayload.category = input.category;
      if (input.startTime !== undefined)
        updatePayload.start_time = input.startTime;
      if (input.durationMinutes !== undefined)
        updatePayload.duration_minutes = input.durationMinutes;
      if (input.monitoringEnabled !== undefined)
        updatePayload.monitoring_enabled = input.monitoringEnabled;
      if (input.status !== undefined) updatePayload.status = input.status;
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("activities")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[activityRepository.update] Supabase error:", error);
        throw new Error(error.message);
      }

      return data ? mapRowToActivity(data as ActivityRow) : null;
    }

    // In-memory fallback
    const index = inMemoryStore.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const existing = inMemoryStore[index];
    const updatedRow: ActivityRow = {
      ...existing,
      title: input.title !== undefined ? input.title : existing.title,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      category: input.category !== undefined ? input.category : existing.category,
      start_time:
        input.startTime !== undefined ? input.startTime : existing.start_time,
      duration_minutes:
        input.durationMinutes !== undefined
          ? input.durationMinutes
          : existing.duration_minutes,
      monitoring_enabled:
        input.monitoringEnabled !== undefined
          ? input.monitoringEnabled
          : existing.monitoring_enabled,
      status: input.status !== undefined ? input.status : existing.status,
      updated_at: new Date().toISOString(),
    };

    inMemoryStore[index] = updatedRow;
    return mapRowToActivity(updatedRow);
  },

  /**
   * Deletes an activity by ID
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("[activityRepository.delete] Supabase error:", error);
        throw new Error(error.message);
      }

      return Boolean(data && data.length > 0);
    }

    // In-memory fallback
    const initialLength = inMemoryStore.length;
    inMemoryStore = inMemoryStore.filter((r) => r.id !== id);
    return inMemoryStore.length < initialLength;
  },
};
