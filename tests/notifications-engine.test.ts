/**
 * Notification engine + forecast timezone tests.
 */

import {
  buildNotificationCandidates,
  groupLocations,
  normalizeLocationKey,
} from "@/lib/notifications/engine";
import { getOverlappingForecastHours } from "@/lib/rules/engine";
import { Activity, HourlyForecast, WeatherContextData } from "@/types";

type Result = { test: string; passed: boolean; error?: string };

function hour(isoUtc: string, overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  const date = new Date(isoUtc);
  return {
    time: isoUtc,
    timeEpoch: Math.floor(date.getTime() / 1000),
    tempC: 24,
    condition: "Clear",
    chanceOfRain: 5,
    precipMm: 0,
    humidity: 60,
    windSpeedKmh: 10,
    feelsLikeC: 24,
    ...overrides,
  };
}

function buildWeather(location: string, hours: HourlyForecast[]): WeatherContextData {
  return {
    location,
    region: "Test",
    country: "Test",
    current: {
      location,
      condition: "Clear",
      temperatureC: 24,
      feelsLikeC: 24,
      precipitationProbability: 5,
      humidity: 60,
      windSpeedKmh: 10,
      updatedAt: "now",
    },
    forecast: [
      {
        date: "2026-11-13",
        maxTempC: 28,
        minTempC: 18,
        chanceOfRain: 5,
        condition: "Clear",
        hours,
      },
    ],
    isLive: true,
    cachedAt: new Date().toISOString(),
  };
}

function baseActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-test",
    title: "Drying Clothes",
    category: "household",
    startTime: "2026-11-13T14:00:00.000Z",
    durationMinutes: 120,
    monitoringEnabled: true,
    status: "pending",
    location: "Hyderabad",
    createdAt: "2026-11-13T08:00:00.000Z",
    ...overrides,
  };
}

export function testNotificationEngine(): Result[] {
  const results: Result[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  // 1. Rain overlap produces a weather candidate with a stable dedupe key.
  const rainyHours = [
    hour("2026-11-13T13:00:00.000Z"),
    hour("2026-11-13T14:00:00.000Z", {
      chanceOfRain: 75,
      condition: "Light Rain",
    }),
    hour("2026-11-13T15:00:00.000Z", {
      chanceOfRain: 80,
      condition: "Light Rain",
    }),
    hour("2026-11-13T16:00:00.000Z"),
  ];
  const activity = baseActivity();
  const weather = buildWeather("Hyderabad", rainyHours);
  const map = new Map([[normalizeLocationKey("Hyderabad"), weather]]);

  const candidates = buildNotificationCandidates(
    [activity],
    map,
    new Date("2026-11-13T09:00:00.000Z")
  );
  const weatherCandidate = candidates.find((c) => c.type === "weather_alert");

  assert(
    "Weather candidate generated for rainy activity window",
    Boolean(weatherCandidate) && weatherCandidate?.severity === "danger"
  );
  assert(
    "Dedupe key is stable across runs",
    weatherCandidate?.dedupeKey ===
      "weather:act-test:2026-11-13T14:00:00.000Z"
  );

  // 2. Same candidate is not duplicated when the engine runs twice.
  const secondRun = buildNotificationCandidates(
    [activity],
    map,
    new Date("2026-11-13T09:05:00.000Z")
  );
  const secondWeather = secondRun.find((c) => c.type === "weather_alert");
  assert(
    "Repeated evaluation yields the same dedupe key",
    secondWeather?.dedupeKey === weatherCandidate?.dedupeKey
  );

  // 3. Completed activities generate nothing.
  const completedCandidates = buildNotificationCandidates(
    [baseActivity({ status: "completed" })],
    map,
    new Date("2026-11-13T09:00:00.000Z")
  );
  assert(
    "Completed activity generates no notifications",
    completedCandidates.length === 0
  );

  // 4. Reminder appears inside the 60-minute window and not before.
  const early = buildNotificationCandidates(
    [baseActivity({ location: "Hyderabad" })],
    new Map(),
    new Date("2026-11-13T12:00:00.000Z")
  );
  const inWindow = buildNotificationCandidates(
    [baseActivity({ location: "Hyderabad" })],
    new Map(),
    new Date("2026-11-13T13:30:00.000Z")
  );
  assert(
    "No reminder more than an hour before start",
    early.every((c) => c.type !== "reminder")
  );
  assert(
    "Reminder generated within an hour of start",
    inWindow.some((c) => c.type === "reminder")
  );

  // 5. Locations inherit the default and are keyed case-insensitively.
  const locations = groupLocations(
    [baseActivity({ location: null }), baseActivity({ id: "b", location: "London" })],
    "Hyderabad"
  );
  assert(
    "Activities without a location inherit the default",
    locations.get("hyderabad") === "Hyderabad"
  );
  assert("Explicit locations are grouped", locations.get("london") === "London");

  // 6. Activities without a location must use the default location's forecast.
  const defaultLocationCandidates = buildNotificationCandidates(
    [baseActivity({ location: null })],
    map,
    new Date("2026-11-13T09:00:00.000Z"),
    "Hyderabad"
  );
  assert(
    "Activity without a location uses the default forecast",
    defaultLocationCandidates.some((c) => c.type === "weather_alert")
  );

  // 7. Timezone regression: provider `time` is location-local but `timeEpoch`
  //    is authoritative. A naive local parse would move the rain window.
  const shiftedHour: HourlyForecast = {
    ...hour("2026-11-13T14:00:00.000Z", {
      chanceOfRain: 90,
      condition: "Heavy Rain",
    }),
    // 08:30 in a UTC-5:30 location; parsing this as the viewer's local time
    // would no longer overlap the 14:00Z activity.
    time: "2026-11-13 08:30",
  };
  const overlap = getOverlappingForecastHours(activity, [shiftedHour]);
  assert(
    "Overlap matching uses timeEpoch, not local time strings",
    overlap.length === 1
  );

  return results;
}
