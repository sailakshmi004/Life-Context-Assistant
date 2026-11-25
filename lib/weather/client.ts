import { DailyForecast, HourlyForecast, WeatherContextData, WeatherSummary } from "@/types";
import { fallbackWeather } from "@/lib/fallback-data";
import { log } from "@/lib/log";

/**
 * Checks whether WeatherAPI credentials are configured.
 */
export function isWeatherApiConfigured(): boolean {
  const key = process.env.WEATHER_API_KEY;
  if (!key) return false;
  if (key === "your-weatherapi-key-here" || key.includes("your-weather")) return false;
  return true;
}

// In-Memory cache for weather responses (15-minute TTL)
interface CacheEntry {
  data: WeatherContextData;
  timestamp: number;
}
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetches weather with a small retry for transient network/5xx failures.
 * Client errors (4xx) are returned immediately because retrying will not help.
 */
async function fetchWeatherWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`WeatherAPI responded with HTTP ${response.status}`);
    } catch (err: unknown) {
      lastError = err;
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("WeatherAPI request failed");
}

/**
 * Neutral placeholder forecast for offline/fallback mode.
 *
 * It deliberately reports 0% rain and an "Unavailable" condition. Alert
 * generation skips non-live data, so this can never fabricate a rain warning.
 */
function generateFallbackForecast(location: string): WeatherContextData {
  const now = new Date();
  const hours: HourlyForecast[] = Array.from({ length: 24 }).map((_, i) => {
    const hourDate = new Date(now);
    hourDate.setHours(i, 0, 0, 0);
    return {
      time: hourDate.toISOString(),
      timeEpoch: Math.floor(hourDate.getTime() / 1000),
      tempC: 0,
      condition: "Unavailable",
      chanceOfRain: 0,
      precipMm: 0,
      humidity: 0,
      windSpeedKmh: 0,
      feelsLikeC: 0,
    };
  });

  const currentSummary: WeatherSummary = {
    location: location || fallbackWeather.location,
    region: "—",
    country: "—",
    condition: "Weather unavailable",
    temperatureC: 0,
    feelsLikeC: 0,
    precipitationProbability: 0,
    humidity: 0,
    windSpeedKmh: 0,
    updatedAt: "—",
    forecastNote:
      "Live weather is unavailable. Add a valid WEATHER_API_KEY or retry later. Alerts are not generated from fallback data.",
  };

  return {
    location: currentSummary.location,
    region: "—",
    country: "—",
    current: currentSummary,
    forecast: [
      {
        date: now.toISOString().split("T")[0],
        maxTempC: 0,
        minTempC: 0,
        chanceOfRain: 0,
        condition: "Unavailable",
        hours,
      },
    ],
    isLive: false,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Fetches real weather and hourly forecasts from WeatherAPI,
 * with caching and automatic fallback.
 */
export async function getWeatherForecast(
  locationQuery: string = "Hyderabad"
): Promise<WeatherContextData> {
  const normalizedLoc = locationQuery.trim() || "Hyderabad";
  const cacheKey = normalizedLoc.toLowerCase();

  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.WEATHER_API_KEY;

  if (!isWeatherApiConfigured() || !apiKey) {
    return generateFallbackForecast(normalizedLoc);
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(normalizedLoc)}&days=2&aqi=no&alerts=no`;

    const res = await fetchWeatherWithRetry(url);

    if (!res.ok) {
      log("warn", "weather", `WeatherAPI returned status ${res.status}; using fallback`);
      return generateFallbackForecast(normalizedLoc);
    }

    const data = await res.json();

    if (data.error) {
      log("warn", "weather", `WeatherAPI error: ${data.error.message}`);
      return generateFallbackForecast(normalizedLoc);
    }

    // Map WeatherAPI response to WeatherContextData
    const currentDayForecast = data.forecast?.forecastday?.[0];
    const dailyChanceOfRain =
      Number(currentDayForecast?.day?.daily_chance_of_rain) ||
      (Number(currentDayForecast?.day?.daily_will_it_rain) ? 100 : 0);

    const forecastHours: HourlyForecast[] = (currentDayForecast?.hour || []).map(
      (h: any) => ({
        time: h.time,
        timeEpoch: h.time_epoch,
        tempC: Math.round(h.temp_c * 10) / 10,
        condition: h.condition?.text || "Unknown",
        conditionIcon: h.condition?.icon?.startsWith("//")
          ? `https:${h.condition.icon}`
          : h.condition?.icon,
        chanceOfRain: Number(h.chance_of_rain || 0),
        precipMm: Number(h.precip_mm || 0),
        humidity: Number(h.humidity || 0),
        windSpeedKmh: Math.round(Number(h.wind_kph || 0)),
        feelsLikeC: Math.round(Number(h.feelslike_c || h.temp_c)),
      })
    );

    const dailyForecasts: DailyForecast[] = (data.forecast?.forecastday || []).map(
      (f: any) => ({
        date: f.date,
        maxTempC: Math.round(f.day?.maxtemp_c),
        minTempC: Math.round(f.day?.mintemp_c),
        chanceOfRain: Number(f.day?.daily_chance_of_rain || 0),
        condition: f.day?.condition?.text || "Clear",
        conditionIcon: f.day?.condition?.icon?.startsWith("//")
          ? `https:${f.day.condition.icon}`
          : f.day?.condition?.icon,
        hours: (f.hour || []).map((h: any) => ({
          time: h.time,
          timeEpoch: h.time_epoch,
          tempC: Math.round(h.temp_c * 10) / 10,
          condition: h.condition?.text || "Unknown",
          conditionIcon: h.condition?.icon?.startsWith("//")
            ? `https:${h.condition.icon}`
            : h.condition?.icon,
          chanceOfRain: Number(h.chance_of_rain || 0),
          precipMm: Number(h.precip_mm || 0),
          humidity: Number(h.humidity || 0),
          windSpeedKmh: Math.round(Number(h.wind_kph || 0)),
          feelsLikeC: Math.round(Number(h.feelslike_c || h.temp_c)),
        })),
      })
    );

    // Create forecast note based on highest chance of rain
    let forecastNote = "No significant rain expected today.";
    const rainyHours = forecastHours.filter((h) => h.chanceOfRain >= 40);
    if (rainyHours.length > 0) {
      const firstHour = rainyHours[0].time.split(" ")[1];
      const lastHour = rainyHours[rainyHours.length - 1].time.split(" ")[1];
      const maxChance = Math.max(...rainyHours.map((h) => h.chanceOfRain));
      forecastNote = `Rain showers expected (${maxChance}% chance) between ${firstHour} and ${lastHour}.`;
    }

    const currentSummary: WeatherSummary = {
      location: data.location.name,
      region: data.location.region,
      country: data.location.country,
      condition: data.current.condition.text,
      conditionIcon: data.current.condition.icon?.startsWith("//")
        ? `https:${data.current.condition.icon}`
        : data.current.condition.icon,
      temperatureC: Math.round(data.current.temp_c * 10) / 10,
      feelsLikeC: Math.round(data.current.feelslike_c * 10) / 10,
      precipitationProbability: dailyChanceOfRain,
      humidity: data.current.humidity,
      windSpeedKmh: Math.round(data.current.wind_kph),
      updatedAt: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      forecastNote,
    };

    const result: WeatherContextData = {
      location: data.location.name,
      region: data.location.region,
      country: data.location.country,
      current: currentSummary,
      forecast: dailyForecasts,
      isLive: true,
      cachedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    log("error", "weather", "Exception fetching forecast; using fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return generateFallbackForecast(normalizedLoc);
  }
}
