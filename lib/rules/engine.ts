import { Activity, AttentionAlert, WeatherSummary } from "@/types";

/**
 * Context Rules Engine (Phase 1)
 *
 * Evaluates whether external conditions (such as forecasted precipitation)
 * conflict with scheduled activities (e.g. drying clothes outdoors).
 */

export interface RuleEvaluationResult {
  shouldAlert: boolean;
  alert?: Omit<AttentionAlert, "id">;
}

export function evaluateWeatherRule(
  activity: Activity,
  weather: WeatherSummary
): RuleEvaluationResult {
  if (activity.contextRule === "none") {
    return { shouldAlert: false };
  }

  // Weather Rain Rule: Check if activity is sensitive to rain and rain is expected
  if (activity.contextRule === "weather_rain") {
    const isOutdoorOrSensitive =
      activity.category === "household" ||
      activity.category === "outdoor" ||
      activity.category === "fitness";

    if (isOutdoorOrSensitive && weather.precipitationProbability >= 50) {
      return {
        shouldAlert: true,
        alert: {
          activityId: activity.id,
          activityTitle: activity.title,
          scheduledTime: `${activity.startTime} (${activity.durationMinutes} mins)`,
          severity: weather.precipitationProbability > 70 ? "danger" : "warning",
          reason: `${weather.precipitationProbability}% chance of rain forecasted during your ${activity.title} window.`,
          suggestion:
            activity.title.toLowerCase().includes("clothes")
              ? "Move laundry to an indoor rack or dry after the rain clears."
              : "Consider rescheduling to an indoor alternative or adjusting the time.",
        },
      };
    }
  }

  return { shouldAlert: false };
}
