"use client";

import React, { useEffect, useState } from "react";
import {
  CloudRain,
  Droplets,
  Wind,
  Thermometer,
  MapPin,
  Info,
  RefreshCw,
  Sun,
  Cloud,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WeatherSummary } from "@/types";

interface WeatherSummaryCardProps {
  weather: WeatherSummary;
  isLive?: boolean;
  onLocationChange?: (newLocation: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function WeatherSummaryCard({
  weather,
  isLive = false,
  onLocationChange,
  onRefresh,
  isLoading = false,
}: WeatherSummaryCardProps) {
  const [locationInput, setLocationInput] = useState(weather.location);
  const isRainRisk = weather.precipitationProbability >= 40;
  const isUnavailable = weather.condition.toLowerCase().includes("unavailable");

  useEffect(() => {
    setLocationInput(weather.location);
  }, [weather.location]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = locationInput.trim();
    if (next && onLocationChange) onLocationChange(next);
  };

  if (isLoading && !isLive) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle>Weather context</CardTitle>
          <CardDescription>Loading the latest forecast…</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1"
          >
            <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
            <input
              type="text"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="City or lat,long"
              aria-label="Weather preview location"
              className="w-32 bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none sm:w-40"
            />
            <button
              type="submit"
              disabled={isLoading || !locationInput.trim()}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title="Search weather for this location"
              aria-label="Search weather for this location"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "success" : "info"}>
              {isLive ? "Live WeatherAPI" : "Fallback data"}
            </Badge>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
                title="Refresh weather"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>
        <CardDescription>
          Search any city for a preview. Alerts use each activity&apos;s location
          or your default from Settings.
        </CardDescription>
        <p className="text-[11px] text-slate-500">
          Changing this preview does not change your alert location.
        </p>
      </CardHeader>

      <div className="mt-2 space-y-4">
        {/* Main Temperature & Condition Box */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-700 overflow-hidden">
              {weather.conditionIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={weather.conditionIcon}
                  alt={weather.condition}
                  className="h-10 w-10 object-contain"
                />
              ) : isRainRisk ? (
                <CloudRain className="h-7 w-7" />
              ) : weather.condition.toLowerCase().includes("sun") ? (
                <Sun className="h-7 w-7 text-amber-500" />
              ) : (
                <Cloud className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {weather.temperatureC}°C
                </span>
                <span className="text-xs text-slate-500">
                  Feels like {weather.feelsLikeC}°C
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {weather.condition}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                isRainRisk
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <CloudRain className="h-3.5 w-3.5" />
              {weather.precipitationProbability}% Rain
            </span>
            <p className="mt-1 text-[11px] text-slate-400">Precipitation Risk</p>
          </div>
        </div>

        {/* Secondary Weather Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400">
              <Droplets className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Humidity</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {weather.humidity}%
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400">
              <Wind className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Wind</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {weather.windSpeedKmh} km/h
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-lg border border-slate-100 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-400">
              <Thermometer className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Outlook</span>
            </div>
            <p
              className={`mt-1 text-sm font-semibold ${
                isUnavailable
                  ? "text-slate-500"
                  : isRainRisk
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {isUnavailable
                ? "No data"
                : isRainRisk
                ? "Rain Inbound"
                : "Optimal Skies"}
            </p>
          </div>
        </div>

        {/* Forecast advisory note */}
        {weather.forecastNote && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-xs border ${
              isRainRisk
                ? "bg-amber-50/80 text-amber-900 border-amber-200/70"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <Info
              className={`h-4 w-4 shrink-0 mt-0.5 ${
                isRainRisk ? "text-amber-600" : "text-slate-400"
              }`}
            />
            <p className="leading-relaxed">
              <span className="font-semibold">Context Advisory:</span>{" "}
              {weather.forecastNote}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
