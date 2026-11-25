import { WeatherSummary } from "@/types";

/**
 * Neutral placeholder used only until the first weather request succeeds.
 * It deliberately reports 0% rain so a transient failure never fabricates an
 * alert. The UI labels this as fallback data, not live conditions.
 */
export const fallbackWeather: WeatherSummary = {
  location: "Your area",
  condition: "Weather unavailable",
  temperatureC: 0,
  feelsLikeC: 0,
  precipitationProbability: 0,
  humidity: 0,
  windSpeedKmh: 0,
  updatedAt: "—",
  forecastNote:
    "Live weather could not be loaded yet. Use Refresh to try again.",
};
