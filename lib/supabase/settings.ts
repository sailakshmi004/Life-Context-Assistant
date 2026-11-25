import { AppSettings, AppSettingsRow } from "@/types";
import { requireSupabase } from "./require-client";

const SETTINGS_ID = "default";
const FALLBACK_LOCATION = "Hyderabad";

export function mapRowToSettings(row: AppSettingsRow): AppSettings {
  return {
    defaultLocation: row.default_location,
    notificationsEnabled: row.notifications_enabled,
    pushEnabled: row.push_enabled,
    lastSyncAt: row.last_sync_at ?? null,
    lastSyncStatus: row.last_sync_status ?? null,
    lastSyncError: row.last_sync_error ?? null,
  };
}

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) throw new Error(`Failed to load settings: ${error.message}`);

    if (!data) {
      // Create the singleton row lazily if the seed did not run.
      const { data: created, error: createError } = await supabase
        .from("app_settings")
        .insert({
          id: SETTINGS_ID,
          default_location: FALLBACK_LOCATION,
          notifications_enabled: true,
          push_enabled: false,
        })
        .select()
        .single();
      if (createError)
        throw new Error(`Failed to initialise settings: ${createError.message}`);
      return mapRowToSettings(created as AppSettingsRow);
    }

    return mapRowToSettings(data as AppSettingsRow);
  },

  async update(input: Partial<AppSettings>): Promise<AppSettings> {
    const supabase = requireSupabase();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.defaultLocation !== undefined)
      payload.default_location = input.defaultLocation;
    if (input.notificationsEnabled !== undefined)
      payload.notifications_enabled = input.notificationsEnabled;
    if (input.pushEnabled !== undefined)
      payload.push_enabled = input.pushEnabled;

    const { data, error } = await supabase
      .from("app_settings")
      .upsert({ id: SETTINGS_ID, ...payload }, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`Failed to update settings: ${error.message}`);
    if (!data) throw new Error("Settings row not found");
    return mapRowToSettings(data as AppSettingsRow);
  },

  /**
   * Records the outcome of the latest notification sync. Failures here are
   * non-fatal: the scheduler should not crash because telemetry could not be
   * written.
   */
  async recordSync(
    status: "ok" | "error",
    error: string | null
  ): Promise<void> {
    const supabase = requireSupabase();
    const { error: dbError } = await supabase
      .from("app_settings")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: error,
      })
      .eq("id", SETTINGS_ID);

    if (dbError) {
      console.warn(
        `[settingsRepository.recordSync] Could not record sync state: ${dbError.message}`
      );
    }
  },
};
