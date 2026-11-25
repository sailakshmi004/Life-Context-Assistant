import { AppNotification, NotificationCandidate } from "@/types";

/**
 * Pure helpers for notification transitions. Kept separate from the sync
 * orchestration so they can be unit-tested without a database.
 */

export function activityTitleFromAlert(title: string): string {
  return title.replace(/^Weather conflict:\s*/, "");
}

/**
 * A forecast is considered changed when the message/severity changes, or when
 * a previously resolved alert becomes active again.
 */
export function hasForecastChanged(
  existing: AppNotification,
  candidate: NotificationCandidate
): boolean {
  return (
    existing.message !== candidate.message ||
    existing.severity !== candidate.severity ||
    Boolean(existing.dismissedAt)
  );
}

export function buildForecastChangeCandidate(
  existing: AppNotification,
  candidate: NotificationCandidate
): NotificationCandidate {
  const activityTitle = activityTitleFromAlert(existing.title);
  const returned = Boolean(existing.dismissedAt);

  return {
    activityId: candidate.activityId,
    type: "forecast_changed",
    severity: candidate.severity,
    title: `${
      returned ? "Weather conflict returned" : "Forecast changed"
    }: ${activityTitle}`,
    message: `${
      returned ? "The weather conflict is active again" : "The forecast changed"
    } for “${activityTitle}”. ${candidate.message}`,
    suggestion: candidate.suggestion,
    scheduledFor: candidate.scheduledFor,
    dedupeKey: `forecast-change:${candidate.activityId ?? "unknown"}:${
      candidate.scheduledFor ?? ""
    }`,
  };
}

export function buildWeatherResolutionCandidate(
  alert: AppNotification
): NotificationCandidate {
  const activityTitle = activityTitleFromAlert(alert.title);

  return {
    activityId: alert.activityId,
    type: "weather_resolved",
    severity: "info",
    title: `Weather conflict resolved: ${activityTitle}`,
    message: `The forecast no longer shows a conflict for “${activityTitle}”.`,
    suggestion: null,
    scheduledFor: alert.scheduledFor ?? null,
    dedupeKey: `resolved:${alert.dedupeKey}`,
  };
}

/**
 * Returns active weather alerts whose dedupe key is no longer produced by the
 * current forecast. Dismissed alerts are ignored.
 */
export function selectStaleWeatherAlerts(
  alerts: AppNotification[],
  activeKeys: string[]
): AppNotification[] {
  const active = new Set(activeKeys);
  return alerts.filter(
    (alert) => !alert.dismissedAt && !active.has(alert.dedupeKey)
  );
}
