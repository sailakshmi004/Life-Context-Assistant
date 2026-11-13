import { Activity, AttentionAlert, WeatherContextData, WeatherSummary, HourlyForecast } from "@/types";
import { formatTimeDisplay } from "@/lib/utils";

/**
 * Context Rules Engine (Phase 3)
 *
 * Evaluates whether external environmental forecasts (such as rain, heat, or wind)
 * conflict with scheduled activities during their specific execution window.
 */

export interface RuleEvaluationResult {
  shouldAlert: boolean;
  alert?: Omit<AttentionAlert, "id">;
  matchingHours?: HourlyForecast[];
  maxRainChance?: number;
}

/**
 * Extracts the hourly forecast slots that overlap with an activity's time window.
 */
export function getOverlappingForecastHours(
  activity: Activity,
  forecastHours: HourlyForecast[]
): HourlyForecast[] {
  if (!forecastHours || forecastHours.length === 0) return [];

  // Parse activity start and calculate end time
  const startDate = new Date(activity.startTime);
  if (isNaN(startDate.getTime())) {
    // If not a full ISO date, fallback to hour matching based on string parsing (e.g. "14:00" or "2:00 PM")
    const match = activity.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return [];

    let hours = parseInt(match[1], 10);
    const isPM = match[3]?.toUpperCase() === "PM";
    const isAM = match[3]?.toUpperCase() === "AM";
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const startMinutes = hours * 60 + parseInt(match[2], 10);
    const endMinutes = startMinutes + activity.durationMinutes;

    return forecastHours.filter((h) => {
      const hDate = new Date(h.time);
      const hHour = !isNaN(hDate.getTime())
        ? hDate.getHours()
        : parseInt(h.time.split(" ")[1]?.split(":")[0] || "0", 10);
      const hMinute = hHour * 60;
      return hMinute >= startMinutes - 30 && hMinute <= endMinutes + 30;
    });
  }

  const startMs = startDate.getTime();
  const endMs = startMs + activity.durationMinutes * 60 * 1000;

  return forecastHours.filter((h) => {
    const hDate = new Date(h.time);
    const hMs = !isNaN(hDate.getTime())
      ? hDate.getTime()
      : h.timeEpoch * 1000;

    // Buffer by 30 minutes on either side of the hourly bucket
    return hMs + 3600000 >= startMs && hMs <= endMs;
  });
}

/**
 * Evaluates an activity against real multi-hour WeatherContextData.
 */
export function evaluateActivityAgainstForecast(
  activity: Activity,
  weatherData: WeatherContextData
): RuleEvaluationResult {
  if (!activity.monitoringEnabled || activity.contextRule === "none") {
    return { shouldAlert: false };
  }

  const allHours: HourlyForecast[] = [];
  weatherData.forecast.forEach((day) => {
    allHours.push(...day.hours);
  });

  const overlapping = getOverlappingForecastHours(activity, allHours);

  // If no specific overlapping hours found, fallback to daily summary
  if (overlapping.length === 0) {
    return evaluateWeatherRule(activity, weatherData.current);
  }

  // Calculate highest rain probability and rain conditions during the scheduled window
  const maxRainChance = Math.max(...overlapping.map((h) => h.chanceOfRain), 0);
  const hasRainCondition = overlapping.some(
    (h) =>
      h.condition.toLowerCase().includes("rain") ||
      h.condition.toLowerCase().includes("shower") ||
      h.condition.toLowerCase().includes("drizzle") ||
      h.condition.toLowerCase().includes("thunderstorm")
  );

  const startDate = new Date(activity.startTime);
  const timeLabel = !isNaN(startDate.getTime())
    ? `${formatTimeDisplay(activity.startTime)} (${activity.durationMinutes} mins)`
    : `${activity.startTime} (${activity.durationMinutes} mins)`;

  if (maxRainChance >= 50 || hasRainCondition) {
    const titleLower = activity.title.toLowerCase();
    let suggestion = "Consider rescheduling to an indoor alternative or adjusting the time.";

    if (titleLower.includes("clothes") || titleLower.includes("laundry")) {
      suggestion = "Move laundry to an indoor drying rack or postpone until after the rain clears.";
    } else if (titleLower.includes("car") || titleLower.includes("wash")) {
      suggestion = "Rain will cause water spots right after washing. Delay until clear skies.";
    } else if (titleLower.includes("jog") || titleLower.includes("run") || titleLower.includes("bike")) {
      suggestion = "Wet, slippery ground expected. Switch to an indoor gym workout or wear rain gear.";
    } else if (titleLower.includes("plant") || titleLower.includes("garden")) {
      suggestion = "Natural rainfall may sufficiently water your garden; you can skip manual watering.";
    }

    return {
      shouldAlert: true,
      maxRainChance,
      matchingHours: overlapping,
      alert: {
        activityId: activity.id,
        activityTitle: activity.title,
        scheduledTime: timeLabel,
        severity: maxRainChance >= 70 ? "danger" : "warning",
        reason: `${maxRainChance}% chance of rain forecasted during your ${activity.title} window.`,
        suggestion,
      },
    };
  }

  return { shouldAlert: false, maxRainChance, matchingHours: overlapping };
}

/**
 * Evaluates an activity against a WeatherSummary (Phase 1/Fallback).
 */
export function evaluateWeatherRule(
  activity: Activity,
  weather: WeatherSummary
): RuleEvaluationResult {
  if (!activity.monitoringEnabled || activity.contextRule === "none") {
    return { shouldAlert: false };
  }

  if (weather.precipitationProbability >= 50) {
    const titleLower = activity.title.toLowerCase();
    let suggestion = "Consider rescheduling to an indoor alternative or adjusting the time.";

    if (titleLower.includes("clothes") || titleLower.includes("laundry")) {
      suggestion = "Move laundry to an indoor drying rack or dry after the rain clears.";
    } else if (titleLower.includes("car")) {
      suggestion = "Consider postponing car wash until clear weather arrives.";
    }

    return {
      shouldAlert: true,
      maxRainChance: weather.precipitationProbability,
      alert: {
        activityId: activity.id,
        activityTitle: activity.title,
        scheduledTime: `${formatTimeDisplay(activity.startTime)} (${activity.durationMinutes} mins)`,
        severity: weather.precipitationProbability > 70 ? "danger" : "warning",
        reason: `${weather.precipitationProbability}% chance of rain forecasted during your ${activity.title} window.`,
        suggestion,
      },
    };
  }

  return { shouldAlert: false, maxRainChance: weather.precipitationProbability };
}
