/**
 * Per-activity weather rule tests.
 */

import {
  evaluateActivityAgainstForecast,
  getOverlappingForecastHours,
} from "@/lib/rules/engine";
import { getRuleTypesForActivity } from "@/lib/rules/registry";
import { Activity, HourlyForecast, WeatherContextData } from "@/types";

type Result = { test: string; passed: boolean; error?: string };

function hour(
  isoUtc: string,
  overrides: Partial<HourlyForecast> = {}
): HourlyForecast {
  const date = new Date(isoUtc);
  return {
    time: isoUtc,
    timeEpoch: Math.floor(date.getTime() / 1000),
    tempC: 24,
    condition: "Clear",
    chanceOfRain: 0,
    precipMm: 0,
    humidity: 50,
    windSpeedKmh: 10,
    feelsLikeC: 24,
    ...overrides,
  };
}

function weather(
  hours: HourlyForecast[],
  isLive = true
): WeatherContextData {
  return {
    location: "Test City",
    region: "Test",
    country: "Test",
    current: {
      location: "Test City",
      condition: "Clear",
      temperatureC: 24,
      feelsLikeC: 24,
      precipitationProbability: 0,
      humidity: 50,
      windSpeedKmh: 10,
      updatedAt: "now",
    },
    forecast: [
      {
        date: "2026-11-26",
        maxTempC: 28,
        minTempC: 18,
        chanceOfRain: 0,
        condition: "Clear",
        hours,
      },
    ],
    isLive,
    cachedAt: new Date().toISOString(),
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "test-activity",
    title: "Outdoor Run",
    category: "fitness",
    startTime: "2026-11-26T06:00:00.000Z",
    durationMinutes: 60,
    monitoringEnabled: true,
    status: "pending",
    location: "Test City",
    createdAt: "2026-11-25T00:00:00.000Z",
    ...overrides,
  };
}

export function testWeatherRules(): Result[] {
  const results: Result[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  // 1. Rule selection is activity-aware.
  const dryingRules = getRuleTypesForActivity({
    title: "Drying Clothes",
    category: "household",
  });
  const runRules = getRuleTypesForActivity({
    title: "Outdoor Run",
    category: "fitness",
  });
  const workRules = getRuleTypesForActivity({
    title: "Weekly Planning",
    category: "work",
  });

  assert(
    "Drying clothes checks rain, wind, and humidity",
    dryingRules.includes("rain") &&
      dryingRules.includes("wind") &&
      dryingRules.includes("humidity") &&
      !dryingRules.includes("heat")
  );
  assert(
    "Outdoor run checks rain, heat, and wind",
    runRules.includes("rain") &&
      runRules.includes("heat") &&
      runRules.includes("wind") &&
      !runRules.includes("humidity")
  );
  assert("Indoor work has no weather rules", workRules.length === 0);

  // 2. Heat finding.
  const heatStart = "2026-11-26T06:00:00.000Z";
  const heatHours = [
    hour("2026-11-26T06:00:00.000Z", { feelsLikeC: 38, tempC: 35 }),
    hour("2026-11-26T07:00:00.000Z", { feelsLikeC: 39, tempC: 36 }),
  ];
  const heatResult = evaluateActivityAgainstForecast(
    activity({ startTime: heatStart }),
    weather(heatHours)
  );
  assert(
    "Heat rule detects dangerous feels-like temperature",
    heatResult.shouldAlert &&
      heatResult.findings.some(
        (finding) => finding.rule === "heat" && finding.severity === "warning"
      )
  );

  // 3. Wind finding.
  const windHours = [
    hour("2026-11-26T06:00:00.000Z", { windSpeedKmh: 48 }),
    hour("2026-11-26T07:00:00.000Z", { windSpeedKmh: 55 }),
  ];
  const windResult = evaluateActivityAgainstForecast(
    activity({ startTime: heatStart }),
    weather(windHours)
  );
  assert(
    "Wind rule detects strong wind",
    windResult.shouldAlert &&
      windResult.findings.some(
        (finding) => finding.rule === "wind" && finding.severity === "warning"
      )
  );

  // 4. Humidity finding for drying clothes.
  const humidityHours = [
    hour("2026-11-26T14:00:00.000Z", { humidity: 86, chanceOfRain: 10 }),
    hour("2026-11-26T15:00:00.000Z", { humidity: 88, chanceOfRain: 10 }),
  ];
  const humidityResult = evaluateActivityAgainstForecast(
    activity({
      title: "Drying Clothes",
      category: "household",
      startTime: "2026-11-26T14:00:00.000Z",
      durationMinutes: 120,
    }),
    weather(humidityHours)
  );
  assert(
    "Humidity rule detects slow-drying conditions",
    humidityResult.shouldAlert &&
      humidityResult.findings.some((finding) => finding.rule === "humidity")
  );

  // 5. Midnight-crossing window includes hours from both days.
  const midnightActivity = activity({
    startTime: "2026-11-26T23:30:00.000Z",
    durationMinutes: 120,
  });
  const midnightHours = [
    hour("2026-11-26T23:00:00.000Z"),
    hour("2026-11-27T00:00:00.000Z"),
    hour("2026-11-27T01:00:00.000Z"),
    hour("2026-11-27T02:00:00.000Z"),
  ];
  const midnightOverlap = getOverlappingForecastHours(
    midnightActivity,
    midnightHours
  );
  assert(
    "Midnight-crossing activity includes both days",
    midnightOverlap.length === 3
  );

  // 6. Fallback weather is never treated as safe.
  const fallbackResult = evaluateActivityAgainstForecast(
    activity(),
    weather([], false)
  );
  assert(
    "Fallback weather returns no alert with fallback data quality",
    !fallbackResult.shouldAlert &&
      fallbackResult.dataQuality === "fallback" &&
      fallbackResult.findings.length === 0
  );

  // 7. Activities outside the forecast range do not use today's summary.
  const farFuture = activity({
    startTime: "2026-12-05T06:00:00.000Z",
  });
  const farResult = evaluateActivityAgainstForecast(
    farFuture,
    weather([hour("2026-11-26T06:00:00.000Z")])
  );
  assert(
    "Far-future activity is marked out of forecast range",
    !farResult.shouldAlert && farResult.dataQuality === "out_of_range"
  );

  // 8. Empty forecast is treated as no data, not clear weather.
  const noData = evaluateActivityAgainstForecast(
    activity(),
    weather([])
  );
  assert(
    "Empty forecast returns no_data",
    !noData.shouldAlert && noData.dataQuality === "no_data"
  );

  // 9. Near-term activity with no hourly overlap uses the daily summary and is
  //    explicitly marked as fallback quality.
  const nearStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const oldHours = [
    hour(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
  ];
  const dailyFallback = weather(oldHours);
  dailyFallback.current.precipitationProbability = 80;
  dailyFallback.current.condition = "Rain";
  const dailyFallbackResult = evaluateActivityAgainstForecast(
    activity({ startTime: nearStart }),
    dailyFallback
  );
  assert(
    "Near-term missing hourly data falls back with explicit quality",
    dailyFallbackResult.shouldAlert &&
      dailyFallbackResult.dataQuality === "fallback" &&
      dailyFallbackResult.findings.some((finding) => finding.rule === "rain")
  );

  return results;
}
