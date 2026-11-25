import {
  AppNotification,
  NotificationCandidate,
  NotificationSyncResult,
  WeatherContextData,
} from "@/types";
import { activityRepository } from "@/lib/supabase/activities";
import { settingsRepository } from "@/lib/supabase/settings";
import { notificationRepository } from "@/lib/supabase/notifications";
import { getWeatherForecast } from "@/lib/weather/client";
import { isPushConfigured, sendPushToAll } from "@/lib/push/server";
import { log } from "@/lib/log";
import {
  buildNotificationCandidates,
  groupLocations,
  normalizeLocationKey,
} from "./engine";
import {
  buildForecastChangeCandidate,
  buildWeatherResolutionCandidate,
  hasForecastChanged,
  selectStaleWeatherAlerts,
} from "./transitions";
import { SingleFlight } from "./single-flight";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const syncFlight = new SingleFlight<NotificationSyncResult>();

function lockedResult(): NotificationSyncResult {
  return {
    evaluatedActivities: 0,
    locations: [],
    created: 0,
    resolved: 0,
    forecastChanges: 0,
    pushed: 0,
    skipped: 0,
    locked: true,
    errors: ["Another notification sync is already running."],
  };
}

function buildPushPayload(created: AppNotification[]) {
  if (created.length === 1) {
    return {
      title: created[0].title,
      body: created[0].message,
      url: "/notifications",
      tag: `notification-${created[0].id}`,
    };
  }

  const preview = created
    .slice(0, 3)
    .map((notification) => notification.title)
    .join(" • ");

  return {
    title: `Awarely: ${created.length} new context alerts`,
    body: preview,
    url: "/notifications",
    tag: "awarely-digest",
  };
}

/**
 * Evaluates every active activity, persists new alerts/reminders, detects
 * forecast changes and resolutions, and delivers a push digest.
 *
 * Safe to run frequently: dedupe keys make persistence idempotent.
 */
export function syncNotifications(): Promise<NotificationSyncResult> {
  return syncFlight.run(runSync, () => {
    log("warn", "sync", "Skipped because another sync is in progress");
    return lockedResult();
  });
}

async function runSync(): Promise<NotificationSyncResult> {
  const startedAt = Date.now();
  const errors: string[] = [];

  try {
    const settings = await settingsRepository.get();
    const { activities } = await activityRepository.getAll();

    const locationMap = groupLocations(activities, settings.defaultLocation);
    const locations = Array.from(locationMap.values());
    const weatherByLocation = new Map<string, WeatherContextData>();
    let weatherComplete = true;

    await Promise.all(
      Array.from(locationMap.entries()).map(async ([key, rawLocation]) => {
        try {
          const weather = await getWeatherForecast(rawLocation);
          if (weather.isLive || process.env.NODE_ENV !== "production") {
            weatherByLocation.set(normalizeLocationKey(key), weather);
          } else {
            weatherComplete = false;
            errors.push(
              `Weather for ${rawLocation} is fallback data; skipped alert evaluation.`
            );
          }
        } catch (err: unknown) {
          weatherComplete = false;
          errors.push(
            `Weather lookup failed for ${rawLocation}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      })
    );

    if (!settings.notificationsEnabled) {
      await settingsRepository.recordSync("ok", null).catch(() => undefined);
      return {
        evaluatedActivities: activities.length,
        locations,
        created: 0,
        resolved: 0,
        forecastChanges: 0,
        pushed: 0,
        skipped: 0,
        locked: false,
        errors,
      };
    }

    const candidates = buildNotificationCandidates(
      activities,
      weatherByLocation,
      new Date(),
      settings.defaultLocation
    );

    const sinceIso = new Date(Date.now() - SIX_HOURS_MS).toISOString();
    const existingAlerts =
      await notificationRepository.listWeatherAlertsForUpcoming(sinceIso);
    const existingByKey = new Map(
      existingAlerts.map((alert) => [alert.dedupeKey, alert])
    );

    const weatherCandidates = candidates.filter(
      (candidate) => candidate.type === "weather_alert"
    );
    const newCandidates: NotificationCandidate[] = candidates.filter(
      (candidate) => candidate.type !== "weather_alert"
    );
    const forecastChangeCandidates: NotificationCandidate[] = [];

    for (const candidate of weatherCandidates) {
      const existing = existingByKey.get(candidate.dedupeKey);

      if (!existing) {
        newCandidates.push(candidate);
        continue;
      }

      const changed = hasForecastChanged(existing, candidate);

      if (!changed) continue;

      await notificationRepository.updateWeatherAlert(existing.id, {
        message: candidate.message,
        severity: candidate.severity,
        suggestion: candidate.suggestion,
      });

      forecastChangeCandidates.push(
        buildForecastChangeCandidate(existing, candidate)
      );
    }

    const created = await notificationRepository.createMany(newCandidates);

    let forecastChanges: AppNotification[] = [];
    try {
      forecastChanges = await notificationRepository.upsertMany(
        forecastChangeCandidates
      );
    } catch (err: unknown) {
      // New notification types require the Milestone 3 migration. Never let a
      // telemetry/notification enhancement break the core alert sync.
      errors.push(
        `Forecast-change notifications failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // Resolve active alerts that no longer match the current forecast.
    const activeKeys = new Set(
      weatherCandidates.map((candidate) => candidate.dedupeKey)
    );
    const staleAlerts = weatherComplete
      ? selectStaleWeatherAlerts(existingAlerts, Array.from(activeKeys))
      : [];

    let resolved = 0;
    if (staleAlerts.length > 0) {
      await notificationRepository.dismissByIds(
        staleAlerts.map((alert) => alert.id)
      );

      const resolutions: NotificationCandidate[] = staleAlerts.map((alert) =>
        buildWeatherResolutionCandidate(alert)
      );

      try {
        await notificationRepository.upsertMany(resolutions);
      } catch (err: unknown) {
        errors.push(
          `Resolution notifications failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
      resolved = resolutions.length;
    }

    let pushed = 0;
    if (
      created.length > 0 &&
      settings.pushEnabled &&
      isPushConfigured()
    ) {
      try {
        const result = await sendPushToAll(buildPushPayload(created));
        pushed = result.sent;
      } catch (err: unknown) {
        errors.push(
          `Push delivery failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    await settingsRepository
      .recordSync(
        errors.length > 0 ? "error" : "ok",
        errors.length > 0 ? errors[0] : null
      )
      .catch(() => undefined);

    const result: NotificationSyncResult = {
      evaluatedActivities: activities.length,
      locations,
      created: created.length,
      resolved,
      forecastChanges: forecastChanges.length,
      pushed,
      skipped: Math.max(candidates.length - created.length, 0),
      locked: false,
      errors,
    };

    log("info", "sync", "completed", {
      durationMs: Date.now() - startedAt,
      ...result,
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await settingsRepository.recordSync("error", message).catch(() => undefined);
    log("error", "sync", "failed", {
      durationMs: Date.now() - startedAt,
      error: message,
    });
    throw err;
  }
}
