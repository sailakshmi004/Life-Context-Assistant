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
 * Environmental rules that can be evaluated for an activity.
 * A single activity may be checked against several rules.
 */
export type EnvironmentalRule = "rain" | "heat" | "wind" | "humidity";

export type RuleSeverity = "warning" | "danger";

export type RuleDataQuality = "live" | "fallback" | "out_of_range" | "no_data";

export interface RuleEvidence {
  metric: "rainChance" | "precipitationMm" | "feelsLikeC" | "windSpeedKmh" | "humidity";
  value: number;
  unit: string;
}

export interface RuleFinding {
  rule: EnvironmentalRule;
  severity: RuleSeverity;
  title: string;
  message: string;
  suggestion: string;
  evidence: RuleEvidence;
  hours: string[];
}

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
  location: string | null;
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
  location?: string | null;

  // Optional context-rule metadata for Phase 1/Phase 4 weather preview
  contextRule?: ContextRuleType;
  weatherAlertTriggered?: boolean;
  /** Rule set derived from the activity category/title (and future overrides). */
  ruleTypes?: EnvironmentalRule[];
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
  location?: string | null;
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
  location?: string | null;
}

export type ActivityValidationErrors = Partial<
  Record<keyof CreateActivityInput, string>
>;

export interface ActivityFacets {
  total: number;
  categories: Record<ActivityCategory, number>;
  statuses: Record<ActivityStatus, number>;
}

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

/* -------------------------------------------------------------------------- */
/*                          Notifications & Settings                          */
/* -------------------------------------------------------------------------- */

export type NotificationType =
  | "weather_alert"
  | "reminder"
  | "activity_completed"
  | "forecast_changed"
  | "weather_resolved"
  | "system";
export type NotificationSeverity = "info" | "warning" | "danger";

/**
 * Database representation of a persisted notification.
 */
export interface NotificationRow {
  id: string;
  activity_id: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  suggestion: string | null;
  scheduled_for: string | null;
  dedupe_key: string;
  is_read: boolean;
  dismissed_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Client representation of a persisted notification.
 */
export interface AppNotification {
  id: string;
  activityId: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  suggestion?: string | null;
  scheduledFor?: string | null;
  dedupeKey: string;
  isRead: boolean;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/**
 * A notification candidate produced by the rules engine before persistence.
 */
export interface NotificationCandidate {
  activityId: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  suggestion: string | null;
  scheduledFor: string | null;
  dedupeKey: string;
}

export interface AppSettingsRow {
  id: string;
  default_location: string;
  notifications_enabled: boolean;
  push_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  defaultLocation: string;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationSyncResult {
  evaluatedActivities: number;
  locations: string[];
  created: number;
  resolved: number;
  forecastChanges: number;
  pushed: number;
  skipped: number;
  locked: boolean;
  errors: string[];
}
