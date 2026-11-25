/**
 * Notification transition tests (forecast changed / resolved).
 */

import {
  buildForecastChangeCandidate,
  buildWeatherResolutionCandidate,
  hasForecastChanged,
  selectStaleWeatherAlerts,
} from "@/lib/notifications/transitions";
import { AppNotification, NotificationCandidate } from "@/types";

type Result = { test: string; passed: boolean; error?: string };

function notification(
  overrides: Partial<AppNotification> = {}
): AppNotification {
  return {
    id: "notification-1",
    activityId: "activity-1",
    type: "weather_alert",
    severity: "warning",
    title: "Weather conflict: Drying Clothes",
    message: "60% chance of rain between 14:00–16:00.",
    suggestion: "Dry indoors.",
    scheduledFor: "2026-11-26T14:00:00.000Z",
    dedupeKey: "weather:activity-1:2026-11-26T14:00:00.000Z",
    isRead: false,
    dismissedAt: null,
    createdAt: "2026-11-25T10:00:00.000Z",
    ...overrides,
  };
}

function candidate(
  overrides: Partial<NotificationCandidate> = {}
): NotificationCandidate {
  return {
    activityId: "activity-1",
    type: "weather_alert",
    severity: "warning",
    title: "Weather conflict: Drying Clothes",
    message: "60% chance of rain between 14:00–16:00.",
    suggestion: "Dry indoors.",
    scheduledFor: "2026-11-26T14:00:00.000Z",
    dedupeKey: "weather:activity-1:2026-11-26T14:00:00.000Z",
    ...overrides,
  };
}

export function testNotificationTransitions(): Result[] {
  const results: Result[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  const existing = notification();

  assert(
    "Unchanged forecast is not marked changed",
    !hasForecastChanged(existing, candidate())
  );
  assert(
    "Changed message is detected",
    hasForecastChanged(
      existing,
      candidate({ message: "80% chance of rain between 14:00–16:00." })
    )
  );
  assert(
    "Changed severity is detected",
    hasForecastChanged(existing, candidate({ severity: "danger" }))
  );
  assert(
    "Dismissed alert is reactivated when the conflict returns",
    hasForecastChanged(
      notification({ dismissedAt: "2026-11-25T11:00:00.000Z" }),
      candidate()
    )
  );

  const changed = buildForecastChangeCandidate(existing, candidate());
  assert(
    "Forecast change candidate has a stable dedupe key",
    changed.type === "forecast_changed" &&
      changed.dedupeKey ===
        "forecast-change:activity-1:2026-11-26T14:00:00.000Z"
  );

  const returned = buildForecastChangeCandidate(
    notification({ dismissedAt: "2026-11-25T11:00:00.000Z" }),
    candidate()
  );
  assert(
    "Returned conflict uses the returned title",
    returned.title.startsWith("Weather conflict returned:")
  );

  const resolved = buildWeatherResolutionCandidate(existing);
  assert(
    "Resolution candidate uses weather_resolved and stable key",
    resolved.type === "weather_resolved" &&
      resolved.severity === "info" &&
      resolved.dedupeKey ===
        "resolved:weather:activity-1:2026-11-26T14:00:00.000Z"
  );

  const staleSelection = selectStaleWeatherAlerts(
    [existing, notification({ id: "dismissed", dedupeKey: "weather:old", dismissedAt: "2026-11-25T11:00:00.000Z" })],
    ["weather:different"]
  );
  assert(
    "Only active, non-matching alerts are selected as stale",
    staleSelection.length === 1 && staleSelection[0].id === "notification-1"
  );

  const noStale = selectStaleWeatherAlerts(
    [existing],
    [existing.dedupeKey]
  );
  assert("Active matching alerts are not stale", noStale.length === 0);

  return results;
}
