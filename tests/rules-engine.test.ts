/**
 * Unit Test Suite Scaffold (Phase 1)
 *
 * Example test for the Context Rules Engine.
 * In future phases, Jest or Vitest will execute this suite in CI.
 */

import { evaluateWeatherRule } from "@/lib/rules/engine";
import { Activity, WeatherSummary } from "@/types";

export function runSampleRuleTest() {
  const mockActivity: Activity = {
    id: "test-1",
    title: "Drying Clothes",
    category: "household",
    startTime: "2:00 PM",
    durationMinutes: 120,
    contextRule: "weather_rain",
    status: "pending",
    createdAt: new Date().toISOString(),
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
