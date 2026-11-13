/**
 * Awarely (Life Context Assistant) - Core Domain Types
 */

export type ActivityCategory =
  | "household"
  | "outdoor"
  | "fitness"
  | "work"
  | "leisure";

export type ActivityStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type ContextRuleType = "weather_rain" | "weather_heat" | "weather_wind" | "none";

/**
 * Database representation of the `activities` table row (PostgreSQL / Supabase)
 */
export interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  start_time: string; // ISO 8601 timestamptz
  duration_minutes: number;
  monitoring_enabled: boolean;
  status: ActivityStatus;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
}

/**
 * Application / Client representation of an Activity.
 * Supports camelCase properties with optional backward-compatible aliases.
 */
export interface Activity {
  id: string;
  title: string;
  description?: string | null;
  category: ActivityCategory;
  startTime: string; // e.g. ISO string or formatted time
  durationMinutes: number;
  monitoringEnabled?: boolean;
  status: ActivityStatus;
  createdAt: string;
  updatedAt?: string;

  // Optional context-rule metadata for Phase 1/Phase 4 weather preview
  contextRule?: ContextRuleType;
  weatherAlertTriggered?: boolean;
  location?: string;
}

/**
 * Input payload for creating a new activity
 */
export interface CreateActivityInput {
  title: string;
  description?: string | null;
  category: ActivityCategory;
  startTime: string;
  durationMinutes: number;
  monitoringEnabled?: boolean;
  status?: ActivityStatus;
}

/**
 * Input payload for partially updating an existing activity
 */
export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  category?: ActivityCategory;
  startTime?: string;
  durationMinutes?: number;
  monitoringEnabled?: boolean;
  status?: ActivityStatus;
}

export type ActivityValidationErrors = Partial<
  Record<keyof CreateActivityInput, string>
>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  message?: string;
}

export interface HourlyForecast {
  time: string; // e.g. "2026-11-13 14:00"
  timeEpoch: number;
  tempC: number;
  condition: string;
  conditionIcon?: string;
  chanceOfRain: number; // 0 - 100
  precipMm: number;
  humidity: number;
  windSpeedKmh: number;
  feelsLikeC: number;
}

export interface DailyForecast {
  date: string;
  maxTempC: number;
  minTempC: number;
  chanceOfRain: number;
  condition: string;
  conditionIcon?: string;
  hours: HourlyForecast[];
}

export interface WeatherSummary {
  location: string;
  region?: string;
  country?: string;
  condition: string;
  conditionIcon?: string;
  temperatureC: number;
  feelsLikeC: number;
  precipitationProbability: number; // 0 - 100%
  humidity: number; // 0 - 100%
  windSpeedKmh: number;
  updatedAt: string;
  forecastNote?: string;
}

export interface WeatherContextData {
  location: string;
  region: string;
  country: string;
  current: WeatherSummary;
  forecast: DailyForecast[];
  isLive: boolean;
  cachedAt: string;
}

export interface Reminder {
  id: string;
  activityId?: string;
  activityTitle: string;
  dueTime: string;
  message: string;
  priority: "low" | "medium" | "high";
  isWeatherAlert?: boolean;
}

export interface AttentionAlert {
  id: string;
  activityId: string;
  activityTitle: string;
  scheduledTime: string;
  severity: "warning" | "danger" | "info";
  reason: string;
  suggestion: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  iconName: "dashboard" | "activities" | "weather" | "notifications" | "settings";
  badge?: number;
}
