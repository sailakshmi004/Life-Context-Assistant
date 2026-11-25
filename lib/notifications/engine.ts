import { Activity, NotificationCandidate, WeatherContextData } from "@/types";
import { evaluateActivityAgainstForecast } from "@/lib/rules/engine";
import { formatTimeDisplay } from "@/lib/utils";

/**
 * Normalises a location string for use as a map key (case/whitespace
 * insensitive). WeatherAPI itself is tolerant of city-name casing.
 */
export function normalizeLocationKey(location: string): string {
  return location.trim().toLowerCase();
}

const REMINDER_WINDOW_MINUTES = 60;

/**
 * Builds the set of notification candidates for the current activity list.
 *
 * This function is pure so it can be unit-tested without a database or network
 * access. Dedupe keys are stable for a given activity occurrence, which lets
 * the scheduler run frequently without spamming the user.
 */
export function buildNotificationCandidates(
  activities: Activity[],
  weatherByLocation: Map<string, WeatherContextData>,
  now: Date = new Date(),
  defaultLocation: string = ""
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  for (const activity of activities) {
    if (activity.status === "completed" || activity.status === "cancelled") {
      continue;
    }

    const rawLocation = activity.location?.trim() || defaultLocation;
    const locationKey = normalizeLocationKey(rawLocation);
    const weather = weatherByLocation.get(locationKey);

    if (weather && activity.monitoringEnabled !== false) {
      const result = evaluateActivityAgainstForecast(activity, weather);
      if (result.shouldAlert && result.alert) {
        candidates.push({
          activityId: activity.id,
          type: "weather_alert",
          severity: result.alert.severity,
          title: `Weather conflict: ${activity.title}`,
          message: result.alert.reason,
          suggestion: result.alert.suggestion,
          scheduledFor: activity.startTime,
          dedupeKey: `weather:${activity.id}:${activity.startTime}`,
        });
      }
    }

    const startMs = new Date(activity.startTime).getTime();
    if (!Number.isNaN(startMs)) {
      const minutesUntilStart = (startMs - now.getTime()) / 60000;
      if (
        minutesUntilStart > 0 &&
        minutesUntilStart <= REMINDER_WINDOW_MINUTES &&
        activity.status === "pending"
      ) {
        candidates.push({
          activityId: activity.id,
          type: "reminder",
          severity: "info",
          title: `Starting soon: ${activity.title}`,
          message: `Scheduled for ${formatTimeDisplay(
            activity.startTime
          )} (${activity.durationMinutes} mins).${
            activity.location ? ` Location: ${activity.location}.` : ""
          }`,
          suggestion: null,
          scheduledFor: activity.startTime,
          dedupeKey: `reminder:${activity.id}:${activity.startTime}`,
        });
      }
    }
  }

  return candidates;
}

/**
 * Groups activities by the location that should drive their weather check.
 * Activities without an explicit location inherit the app default.
 */
export function groupLocations(
  activities: Activity[],
  defaultLocation: string
): Map<string, string> {
  const locations = new Map<string, string>();
  for (const activity of activities) {
    if (activity.status === "completed" || activity.status === "cancelled") {
      continue;
    }
    const raw = activity.location?.trim() || defaultLocation;
    if (!raw) continue;
    locations.set(normalizeLocationKey(raw), raw);
  }
  return locations;
}
