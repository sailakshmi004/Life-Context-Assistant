import {
  Activity,
  AttentionAlert,
  HourlyForecast,
  RuleDataQuality,
  RuleFinding,
  WeatherContextData,
  WeatherSummary,
} from "@/types";
import { formatTimeDisplay } from "@/lib/utils";
import { evaluateRules } from "./registry";

/**
 * Context Rules Engine
 *
 * Compares an activity's scheduled window with the hourly forecast. The actual
 * per-condition logic lives in `registry.ts`; this file handles window overlap,
 * data quality, and converting findings into user-facing alerts.
 */

export interface RuleEvaluationResult {
  shouldAlert: boolean;
  alert?: Omit<AttentionAlert, "id">;
  findings: RuleFinding[];
  primaryFinding?: RuleFinding;
  matchingHours?: HourlyForecast[];
  maxRainChance?: number;
  dataQuality: RuleDataQuality;
}

/**
 * Resolves the absolute UTC timestamp (ms) for a forecast hour.
 *
 * WeatherAPI returns hour.time as a location-local string with no offset, so
 * `new Date(h.time)` would be interpreted in the *viewer's* timezone and shift
 * the match. `timeEpoch` is always UTC and is therefore authoritative.
 */
function forecastHourMs(hour: HourlyForecast): number | null {
  if (Number.isFinite(hour.timeEpoch) && hour.timeEpoch > 0) {
    return hour.timeEpoch * 1000;
  }
  const parsed = new Date(hour.time).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Extracts the hourly forecast slots that overlap with an activity's time window.
 */
export function getOverlappingForecastHours(
  activity: Activity,
  forecastHours: HourlyForecast[]
): HourlyForecast[] {
  if (!forecastHours || forecastHours.length === 0) return [];

  const startDate = new Date(activity.startTime);
  if (isNaN(startDate.getTime())) {
    // Legacy activities may store a time-only string such as "2:00 PM".
    const match = activity.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return [];

    let hours = parseInt(match[1], 10);
    const isPM = match[3]?.toUpperCase() === "PM";
    const isAM = match[3]?.toUpperCase() === "AM";
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const startMinutes = hours * 60 + parseInt(match[2], 10);
    const endMinutes = startMinutes + activity.durationMinutes;

    return forecastHours.filter((hour) => {
      const timeMatch = hour.time.match(/(\d{1,2}):(\d{2})/);
      let hourMinute: number;
      if (timeMatch) {
        hourMinute =
          parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
      } else {
        const hourMs = forecastHourMs(hour);
        if (hourMs === null) return false;
        const date = new Date(hourMs);
        hourMinute = date.getHours() * 60 + date.getMinutes();
      }
      return hourMinute >= startMinutes - 30 && hourMinute <= endMinutes + 30;
    });
  }

  const startMs = startDate.getTime();
  const endMs = startMs + activity.durationMinutes * 60 * 1000;

  return forecastHours.filter((hour) => {
    const hourMs = forecastHourMs(hour);
    if (hourMs === null) return false;

    // Hourly buckets cover the full hour, with a 30-minute buffer either side.
    return hourMs + 3_600_000 >= startMs && hourMs <= endMs;
  });
}

function buildAlertFromFindings(
  activity: Activity,
  findings: RuleFinding[]
): Omit<AttentionAlert, "id"> | undefined {
  const primary = findings[0];
  if (!primary) return undefined;

  const startDate = new Date(activity.startTime);
  const timeLabel = !isNaN(startDate.getTime())
    ? `${formatTimeDisplay(activity.startTime)} (${activity.durationMinutes} mins)`
    : `${activity.startTime} (${activity.durationMinutes} mins)`;

  const suggestions = Array.from(
    new Set(findings.map((finding) => finding.suggestion).filter(Boolean))
  );

  return {
    activityId: activity.id,
    activityTitle: activity.title,
    scheduledTime: timeLabel,
    severity: primary.severity,
    reason: findings.map((finding) => finding.message).join(" "),
    suggestion: suggestions.join(" "),
  };
}

/**
 * Evaluates an activity against real multi-hour WeatherContextData.
 */
export function evaluateActivityAgainstForecast(
  activity: Activity,
  weatherData: WeatherContextData
): RuleEvaluationResult {
  if (!activity.monitoringEnabled || activity.contextRule === "none") {
    return { shouldAlert: false, findings: [], dataQuality: "live" };
  }

  // Never treat unavailable weather as safe weather.
  if (weatherData.isLive === false) {
    return { shouldAlert: false, findings: [], dataQuality: "fallback" };
  }

  const allHours: HourlyForecast[] = [];
  weatherData.forecast.forEach((day) => allHours.push(...day.hours));

  if (allHours.length === 0) {
    return { shouldAlert: false, findings: [], dataQuality: "no_data" };
  }

  const overlapping = getOverlappingForecastHours(activity, allHours);

  // If there are no matching hourly slots, use the daily summary only when the
  // activity is near the current time. A task next week must not be judged by
  // today's conditions.
  if (overlapping.length === 0) {
    const startMs = new Date(activity.startTime).getTime();
    if (Number.isNaN(startMs)) {
      return evaluateWeatherRule(activity, weatherData.current);
    }
    const hoursUntilStart = (startMs - Date.now()) / 3_600_000;
    if (hoursUntilStart <= 24 && hoursUntilStart >= -12) {
      return evaluateWeatherRule(activity, weatherData.current);
    }
    return { shouldAlert: false, findings: [], dataQuality: "out_of_range" };
  }

  const maxRainChance = Math.max(
    ...overlapping.map((hour) => hour.chanceOfRain),
    0
  );
  const findings = evaluateRules(activity, overlapping);

  if (findings.length === 0) {
    return {
      shouldAlert: false,
      findings,
      matchingHours: overlapping,
      maxRainChance,
      dataQuality: "live",
    };
  }

  return {
    shouldAlert: true,
    alert: buildAlertFromFindings(activity, findings),
    findings,
    primaryFinding: findings[0],
    matchingHours: overlapping,
    maxRainChance,
    dataQuality: "live",
  };
}

/**
 * Legacy/daily-summary evaluation, also used when hourly overlap is unavailable
 * but the activity is near the current time.
 */
export function evaluateWeatherRule(
  activity: Activity,
  weather: WeatherSummary
): RuleEvaluationResult {
  if (!activity.monitoringEnabled || activity.contextRule === "none") {
    return { shouldAlert: false, findings: [], dataQuality: "live" };
  }

  const probability = weather.precipitationProbability;

  if (probability < 50) {
    return {
      shouldAlert: false,
      findings: [],
      maxRainChance: probability,
      dataQuality: "fallback",
    };
  }

  const titleLower = activity.title.toLowerCase();
  let suggestion = "Consider rescheduling to an indoor alternative or adjusting the time.";

  if (titleLower.includes("clothes") || titleLower.includes("laundry")) {
    suggestion =
      "Move laundry to an indoor drying rack or dry after the rain clears.";
  } else if (titleLower.includes("car")) {
    suggestion = "Consider postponing car wash until clear weather arrives.";
  }

  const severity = probability > 70 ? "danger" : "warning";
  const message = `${probability}% chance of rain forecasted during your ${activity.title} window.`;
  const finding: RuleFinding = {
    rule: "rain",
    severity,
    title: "Rain conflict",
    message,
    suggestion,
    evidence: { metric: "rainChance", value: probability, unit: "%" },
    hours: [],
  };

  return {
    shouldAlert: true,
    alert: {
      activityId: activity.id,
      activityTitle: activity.title,
      scheduledTime: `${formatTimeDisplay(activity.startTime)} (${activity.durationMinutes} mins)`,
      severity,
      reason: message,
      suggestion,
    },
    findings: [finding],
    primaryFinding: finding,
    maxRainChance: probability,
    dataQuality: "fallback",
  };
}
