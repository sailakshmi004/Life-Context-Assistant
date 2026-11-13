/**
 * Context Rules Engine Test Suite (Phase 3)
 */

import {
  evaluateWeatherRule,
  evaluateActivityAgainstForecast,
  getOverlappingForecastHours,
} from "@/lib/rules/engine";
import { Activity, HourlyForecast, WeatherContextData, WeatherSummary } from "@/types";

export function runSampleRuleTest() {
  const mockActivity: Activity = {
    id: "test-1",
    title: "Drying Clothes",
    category: "household",
    startTime: "2:00 PM",
    durationMinutes: 120,
    contextRule: "weather_rain",
    monitoringEnabled: true,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rainyWeather: WeatherSummary = {
    location: "Test City",
    condition: "Rainy",
    temperatureC: 20,
    feelsLikeC: 20,
    precipitationProbability: 80,
    humidity: 90,
    windSpeedKmh: 15,
    updatedAt: "now",
  };

  const result = evaluateWeatherRule(mockActivity, rainyWeather);
  return result.shouldAlert === true;
}

export function testContextRulesEngine() {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  // 1. Basic Weather Rule test
  assert("Basic rule flags weather conflict on drying clothes", runSampleRuleTest());

  // 2. Multi-hour forecast evaluation test
  const hours: HourlyForecast[] = Array.from({ length: 24 }).map((_, i) => ({
    time: `2026-11-13 ${i.toString().padStart(2, "0")}:00`,
    timeEpoch: 1794418453 + i * 3600,
    tempC: 24,
    condition: i >= 14 && i <= 16 ? "Light Rain" : "Partly Cloudy",
    chanceOfRain: i >= 14 && i <= 16 ? 75 : 10,
    precipMm: i >= 14 && i <= 16 ? 2.0 : 0,
    humidity: 70,
    windSpeedKmh: 12,
    feelsLikeC: 24,
  }));

  const mockContextData: WeatherContextData = {
    location: "Hyderabad",
    region: "Telangana",
    country: "India",
    current: {
      location: "Hyderabad",
      condition: "Partly Cloudy",
      temperatureC: 25,
      feelsLikeC: 25,
      precipitationProbability: 20,
      humidity: 60,
      windSpeedKmh: 10,
      updatedAt: "now",
    },
    forecast: [
      {
        date: "2026-11-13",
        maxTempC: 28,
        minTempC: 18,
        chanceOfRain: 75,
        condition: "Scattered Showers",
        hours,
      },
    ],
    isLive: true,
    cachedAt: new Date().toISOString(),
  };

  const laundryActivity: Activity = {
    id: "act-laundry",
    title: "Drying Laundry",
    category: "household",
    startTime: "2:00 PM",
    durationMinutes: 120, // 2:00 PM to 4:00 PM (14:00 to 16:00)
    monitoringEnabled: true,
    contextRule: "weather_rain",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const evalResult = evaluateActivityAgainstForecast(laundryActivity, mockContextData);
  assert(
    "Forecast evaluation detects rain conflict in activity window",
    evalResult.shouldAlert === true &&
      Boolean(evalResult.alert?.reason.includes("75%"))
  );

  // 3. Clear skies activity (morning jog at 7:00 AM)
  const jogActivity: Activity = {
    id: "act-jog",
    title: "Morning Jog",
    category: "fitness",
    startTime: "7:00 AM",
    durationMinutes: 45,
    monitoringEnabled: true,
    contextRule: "weather_rain",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const jogEval = evaluateActivityAgainstForecast(jogActivity, mockContextData);
  assert("Forecast evaluation does NOT alert during dry window", jogEval.shouldAlert === false);

  // 4. Monitoring disabled activity
  const unmonitoredActivity: Activity = {
    ...laundryActivity,
    monitoringEnabled: false,
  };
  const unmonitoredEval = evaluateActivityAgainstForecast(unmonitoredActivity, mockContextData);
  assert("Monitoring disabled activity produces no alerts", unmonitoredEval.shouldAlert === false);

  return results;
}
