import {
  Activity,
  AppNotification,
  NotificationCandidate,
  NotificationRow,
} from "@/types";
import { requireSupabase } from "./require-client";

export function mapRowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    activityId: row.activity_id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    suggestion: row.suggestion,
    scheduledFor: row.scheduled_for,
    dedupeKey: row.dedupe_key,
    isRead: row.is_read,
    dismissedAt: row.dismissed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

export interface NotificationListOptions {
  unreadOnly?: boolean;
  includeDismissed?: boolean;
  activityId?: string;
  limit?: number;
}

export const notificationRepository = {
  async list(options: NotificationListOptions = {}): Promise<AppNotification[]> {
    const supabase = requireSupabase();
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 100);

    if (!options.includeDismissed) query = query.is("dismissed_at", null);
    if (options.unreadOnly) query = query.eq("is_read", false);
    if (options.activityId) query = query.eq("activity_id", options.activityId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to load notifications: ${error.message}`);
    return ((data ?? []) as NotificationRow[]).map(mapRowToNotification);
  },

  async countUnread(): Promise<number> {
    const supabase = requireSupabase();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .is("dismissed_at", null);

    if (error) throw new Error(`Failed to count notifications: ${error.message}`);
    return count ?? 0;
  },

  async existingDedupeKeys(keys: string[]): Promise<Set<string>> {
    if (keys.length === 0) return new Set();
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .select("dedupe_key")
      .in("dedupe_key", keys);

    if (error) throw new Error(`Failed to check notifications: ${error.message}`);
    return new Set(
      ((data ?? []) as Pick<NotificationRow, "dedupe_key">[]).map(
        (row) => row.dedupe_key
      )
    );
  },

  /**
   * Inserts only candidates whose dedupe_key does not already exist.
   * Returns the rows that were actually inserted.
   */
  async createMany(
    candidates: NotificationCandidate[]
  ): Promise<AppNotification[]> {
    if (candidates.length === 0) return [];
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("notifications")
      .upsert(
        candidates.map((candidate) => ({
          activity_id: candidate.activityId,
          type: candidate.type,
          severity: candidate.severity,
          title: candidate.title,
          message: candidate.message,
          suggestion: candidate.suggestion,
          scheduled_for: candidate.scheduledFor,
          dedupe_key: candidate.dedupeKey,
        })),
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      )
      .select();

    if (error) throw new Error(`Failed to save notifications: ${error.message}`);
    return ((data ?? []) as NotificationRow[]).map(mapRowToNotification);
  },

  /**
   * Upserts notifications, updating existing rows on the same dedupe key.
   * Used for forecast-change and weather-resolved events, which should refresh
   * rather than create an unlimited history.
   */
  async upsertMany(
    candidates: NotificationCandidate[]
  ): Promise<AppNotification[]> {
    if (candidates.length === 0) return [];
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("notifications")
      .upsert(
        candidates.map((candidate) => ({
          activity_id: candidate.activityId,
          type: candidate.type,
          severity: candidate.severity,
          title: candidate.title,
          message: candidate.message,
          suggestion: candidate.suggestion,
          scheduled_for: candidate.scheduledFor,
          dedupe_key: candidate.dedupeKey,
          is_read: false,
          dismissed_at: null,
        })),
        { onConflict: "dedupe_key" }
      )
      .select();

    if (error) throw new Error(`Failed to upsert notifications: ${error.message}`);
    return ((data ?? []) as NotificationRow[]).map(mapRowToNotification);
  },

  /**
   * Returns weather-alert rows (active and dismissed) for recent or upcoming
   * activities. Used to detect forecast changes and reactivation.
   */
  async listWeatherAlertsForUpcoming(
    sinceIso: string
  ): Promise<AppNotification[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("type", "weather_alert")
      .gte("scheduled_for", sinceIso)
      .order("scheduled_for", { ascending: true });

    if (error)
      throw new Error(`Failed to inspect weather alerts: ${error.message}`);
    return ((data ?? []) as NotificationRow[]).map(mapRowToNotification);
  },

  /**
   * Updates an existing weather alert, e.g. when the forecast changes or a
   * previously resolved conflict returns.
   */
  async updateWeatherAlert(
    id: string,
    input: {
      message: string;
      severity: NotificationCandidate["severity"];
      suggestion: string | null;
    }
  ): Promise<boolean> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({
        message: input.message,
        severity: input.severity,
        suggestion: input.suggestion,
        dismissed_at: null,
        is_read: false,
      })
      .eq("id", id)
      .select("id");

    if (error)
      throw new Error(`Failed to update weather alert: ${error.message}`);
    return Boolean(data && data.length > 0);
  },

  async dismissByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({
        dismissed_at: new Date().toISOString(),
        is_read: true,
      })
      .in("id", ids)
      .select("id");

    if (error)
      throw new Error(`Failed to dismiss notifications: ${error.message}`);
    return data?.length ?? 0;
  },

  /**
   * Dismisses active weather/reminder notifications for an activity, e.g. when
   * the user completes or cancels it.
   */
  async dismissActiveForActivity(activityId: string): Promise<number> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({
        dismissed_at: new Date().toISOString(),
        is_read: true,
      })
      .eq("activity_id", activityId)
      .in("type", ["weather_alert", "reminder"])
      .is("dismissed_at", null)
      .select("id");

    if (error)
      throw new Error(
        `Failed to dismiss activity notifications: ${error.message}`
      );
    return data?.length ?? 0;
  },

  async createCompletion(activity: Activity): Promise<AppNotification | null> {
    const created = await this.createMany([
      {
        activityId: activity.id,
        type: "activity_completed",
        severity: "info",
        title: `Activity completed: ${activity.title}`,
        message: `You marked “${activity.title}” as completed.`,
        suggestion: null,
        scheduledFor: activity.startTime,
        dedupeKey: `completed:${activity.id}:${activity.startTime}`,
      },
    ]);
    return created[0] ?? null;
  },

  async markRead(id: string, isRead = true): Promise<boolean> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Failed to update notification: ${error.message}`);
    return Boolean(data && data.length > 0);
  },

  async dismiss(id: string): Promise<boolean> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({ dismissed_at: new Date().toISOString(), is_read: true })
      .eq("id", id)
      .select("id");

    if (error) throw new Error(`Failed to dismiss notification: ${error.message}`);
    return Boolean(data && data.length > 0);
  },

  async markAllRead(): Promise<number> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false)
      .is("dismissed_at", null)
      .select("id");

    if (error) throw new Error(`Failed to update notifications: ${error.message}`);
    return data?.length ?? 0;
  },

  /**
   * Auto-resolves upcoming weather alerts that no longer match the current
   * forecast. Past alerts are left intact as history.
   */
  async resolveStaleWeatherAlerts(activeKeys: string[]): Promise<number> {
    const supabase = requireSupabase();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, dedupe_key")
      .eq("type", "weather_alert")
      .is("dismissed_at", null)
      .gte("scheduled_for", sixHoursAgo);

    if (error)
      throw new Error(`Failed to inspect weather alerts: ${error.message}`);

    const active = new Set(activeKeys);
    const staleIds = ((data ?? []) as Pick<NotificationRow, "id" | "dedupe_key">[])
      .filter((row) => !active.has(row.dedupe_key))
      .map((row) => row.id);

    if (staleIds.length === 0) return 0;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        dismissed_at: new Date().toISOString(),
        is_read: true,
      })
      .in("id", staleIds);

    if (updateError)
      throw new Error(
        `Failed to resolve stale alerts: ${updateError.message}`
      );

    return staleIds.length;
  },
};
