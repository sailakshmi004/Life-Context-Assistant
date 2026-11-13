"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CloudSun,
  CloudRain,
  Droplets,
  Wind,
  AlertCircle,
  MapPin,
  RefreshCw,
  Sun,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WeatherContextData } from "@/types";

const CITIES = [
  "Hyderabad",
  "London",
  "New York",
  "San Francisco",
  "Tokyo",
  "Sydney",
];

export default function WeatherPage() {
  const [selectedCity, setSelectedCity] = useState("Hyderabad");
  const [weatherData, setWeatherData] = useState<WeatherContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (city: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(city)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load weather forecast");
      }
      setWeatherData(json.data);
    } catch (err: unknown) {
      console.error("[WeatherPage] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [fetchWeather, selectedCity]);

  const current = weatherData?.current;
  const todayForecast = weatherData?.forecast?.[0];
  const hours = todayForecast?.hours || [];
  const hasRainAlert = (current?.precipitationProbability || 0) >= 40;

  return (
    <div className="space-y-6">
      {/* Top Header with City Selector */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Weather Context
          </h1>
          <p className="text-sm text-slate-500">
            Real-time atmospheric parameters powering Awarely&apos;s activity context engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 shadow-sm">
            <MapPin className="h-4 w-4 text-brand-600" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchWeather(selectedCity)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              {current?.conditionIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.conditionIcon}
                  alt={current.condition}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Sun className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Temperature</p>
              <p className="text-2xl font-bold text-slate-900">
                {current?.temperatureC ?? "--"}°C
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Feels like {current?.feelsLikeC ?? "--"}°C • {current?.condition || "Loading..."}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                hasRainAlert
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CloudRain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Rain Probability</p>
              <p
                className={`text-2xl font-bold ${
                  hasRainAlert ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {current?.precipitationProbability ?? "--"}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {hasRainAlert ? "Rain alert active today" : "Low precipitation risk"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Droplets className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Humidity</p>
              <p className="text-2xl font-bold text-slate-900">
                {current?.humidity ?? "--"}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Relative moisture saturation
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Wind className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Wind Velocity</p>
              <p className="text-2xl font-bold text-slate-900">
                {current?.windSpeedKmh ?? "--"} km/h
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Outdoor drying air circulation
          </p>
        </Card>
      </div>

      {/* 24-Hour Visual Hourly Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>24-Hour Hourly Weather Timeline</CardTitle>
            <Badge variant={weatherData?.isLive ? "success" : "neutral"}>
              {weatherData?.isLive ? "WeatherAPI Live" : "Offline Fallback"}
            </Badge>
          </div>
          <CardDescription>
            Hourly precipitation risk used to calculate conflicts for scheduled tasks
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <div className="flex h-36 items-center justify-center text-xs text-slate-400">
            Loading forecast timeline...
          </div>
        ) : hours.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No hourly data available.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-[760px] pt-2">
              {hours.map((h, i) => {
                const hourNum = h.time.includes(" ")
                  ? h.time.split(" ")[1]
                  : new Date(h.time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      hour12: true,
                    });
                const isHighRain = h.chanceOfRain >= 50;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-colors min-w-[70px] ${
                      isHighRain
                        ? "border-rose-200 bg-rose-50/50"
                        : "border-slate-100 bg-slate-50/60"
                    }`}
                  >
                    <span className="text-[11px] font-medium text-slate-600">
                      {hourNum}
                    </span>

                    <div className="my-1.5 flex h-7 w-7 items-center justify-center">
                      {h.conditionIcon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.conditionIcon}
                          alt={h.condition}
                          className="h-7 w-7 object-contain"
                        />
                      ) : isHighRain ? (
                        <CloudRain className="h-5 w-5 text-rose-600" />
                      ) : (
                        <Cloud className="h-5 w-5 text-slate-400" />
                      )}
                    </div>

                    <span className="text-xs font-bold text-slate-900">
                      {h.tempC}°
                    </span>

                    <span
                      className={`mt-1 text-[10px] font-semibold ${
                        isHighRain ? "text-rose-700" : "text-sky-600"
                      }`}
                    >
                      {h.chanceOfRain}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Context Engine Architecture Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
            <CardTitle>How Awarely Uses Weather Context</CardTitle>
          </div>
          <CardDescription>
            The automated decision flow linking external conditions to user schedules
          </CardDescription>
        </CardHeader>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Unlike conventional reminder apps that alert blindly at set times, Awarely
            cross-references your activity&apos;s start time and duration with the hourly forecast:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="font-semibold text-slate-900 block mb-1">
                1. Activity Window Analysis
              </span>
              Calculates start and finish timestamps (e.g. 2:00 PM + 120 mins = 4:00 PM).
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="font-semibold text-slate-900 block mb-1">
                2. Weather Window Extraction
              </span>
              Extracts matching hourly precipitation and wind probabilities from WeatherAPI.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="font-semibold text-slate-900 block mb-1">
                3. Actionable Alert Generation
              </span>
              Triggers contextual recommendations (e.g. drying laundry indoors) before tasks begin.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
