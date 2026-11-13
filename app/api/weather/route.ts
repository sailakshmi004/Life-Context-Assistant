import { NextRequest, NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/weather/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather
 * Returns live/cached weather and hourly forecast data for context evaluation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") || "Hyderabad";

    const weatherData = await getWeatherForecast(location);

    return NextResponse.json(
      {
        success: true,
        data: weatherData,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[GET /api/weather] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch weather data";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
