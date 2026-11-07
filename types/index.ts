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

export interface Activity {
  id: string;
  title: string;
  description?: string;
  category: ActivityCategory;
  startTime: string; // e.g. "14:00" or ISO timestamp
  durationMinutes: number; // e.g. 120
  location?: string;
  contextRule: ContextRuleType;
  status: ActivityStatus;
  weatherAlertTriggered?: boolean;
  createdAt: string;
}

export interface WeatherSummary {
  location: string;
  condition: "Sunny" | "Partly Cloudy" | "Cloudy" | "Rainy" | "Thunderstorm";
  temperatureC: number;
  feelsLikeC: number;
  precipitationProbability: number; // 0 - 100%
  humidity: number; // 0 - 100%
  windSpeedKmh: number;
  updatedAt: string;
  forecastNote?: string;
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
