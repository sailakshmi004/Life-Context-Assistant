import { DailyForecast, HourlyForecast, WeatherContextData, WeatherSummary } from "@/types";
import { mockWeather } from "@/lib/mock-data";

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
 * Generates synthetic 24-hour mock forecast for offline/fallback mode.
 */
function generateFallbackForecast(location: string): WeatherContextData {
  const now = new Date();
  const currentHour = now.getHours();

  const hours: HourlyForecast[] = Array.from({ length: 24 }).map((_, i) => {
    const hourDate = new Date(now);
    hourDate.setHours(i, 0, 0, 0);

    // Create an afternoon rain peak between 14:00 (2 PM) and 17:00 (5 PM)
    const isRainWindow = i >= 14 && i <= 17;
    const chance = isRainWindow ? 75 : i >= 12 && i <= 19 ? 35 : 10;

    return {
      time: hourDate.toISOString(),
      timeEpoch: Math.floor(hourDate.getTime() / 1000),
      tempC: isRainWindow ? 22 : 24 - Math.abs(14 - i) * 0.8,
      condition: isRainWindow ? "Light Rain Showers" : i > 6 && i < 19 ? "Partly Cloudy" : "Clear",
      chanceOfRain: chance,
      precipMm: isRainWindow ? 2.5 : 0,
      humidity: isRainWindow ? 82 : 65,
      windSpeedKmh: 14,
      feelsLikeC: isRainWindow ? 22 : 25,
    };
  });

  const daily: DailyForecast = {
    date: now.toISOString().split("T")[0],
    maxTempC: 26,
    minTempC: 18,
    chanceOfRain: 75,
    condition: "Scattered Showers",
    hours,
  };

  const currentSummary: WeatherSummary = {
    location: location || mockWeather.location,
    region: "Metropolitan Area",
    country: "US",
    condition: currentHour >= 14 && currentHour <= 17 ? "Light Rain Showers" : "Partly Cloudy",
    temperatureC: 24,
    feelsLikeC: 25,
    precipitationProbability: currentHour >= 14 && currentHour <= 17 ? 75 : 30,
    humidity: 72,
    windSpeedKmh: 14,
    updatedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    forecastNote: "Scattered showers predicted between 2:00 PM and 5:00 PM today.",
  };

  return {
    location: currentSummary.location,
    region: "Metropolitan Area",
    country: "US",
    current: currentSummary,
    forecast: [daily],
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
    const fallback = generateFallbackForecast(normalizedLoc);
    weatherCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return fallback;
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(normalizedLoc)}&days=2&aqi=no&alerts=no`;

    const res = await fetch(url, {
      next: { revalidate: 900 }, // 15 minutes Next.js ISR cache
    });

    if (!res.ok) {
      console.warn(`[WeatherAPI] API returned status ${res.status}. Using fallback forecast.`);
      return generateFallbackForecast(normalizedLoc);
    }

    const data = await res.json();

    if (data.error) {
      console.warn(`[WeatherAPI] API error: ${data.error.message}`);
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
    console.error("[WeatherAPI] Exception fetching forecast:", err);
    return generateFallbackForecast(normalizedLoc);
  }
}
