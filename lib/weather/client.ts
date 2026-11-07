import { WeatherSummary } from "@/types";
import { mockWeather } from "@/lib/mock-data";

/**
 * Weather Service Client (Phase 1)
 *
 * Provides weather data to the application.
 * In Phase 1, returns structured mock data.
 * In future phases, this will query WeatherAPI (via server-side route handler
 * or API routes) using WEATHER_API_KEY.
 */

export interface WeatherFetchOptions {
  location?: string;
  daysAhead?: number;
}

export async function fetchCurrentWeather(
  options: WeatherFetchOptions = {}
): Promise<WeatherSummary> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    // Graceful fallback to mock data when API key is not configured (Phase 1)
    return {
      ...mockWeather,
      location: options.location || mockWeather.location,
    };
  }

  // Future phase: implement WeatherAPI fetch
  return mockWeather;
}
