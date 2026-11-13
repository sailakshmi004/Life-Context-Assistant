"use client";

import React from "react";
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

const COMMON_LOCATIONS = [
  "Hyderabad",
  "London",
  "New York",
  "San Francisco",
  "Tokyo",
  "Sydney",
];

export function WeatherSummaryCard({
  weather,
  isLive = false,
  onLocationChange,
  onRefresh,
  isLoading = false,
}: WeatherSummaryCardProps) {
  const isRainRisk = weather.precipitationProbability >= 40;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <select
              value={weather.location}
              onChange={(e) => onLocationChange?.(e.target.value)}
              className="font-semibold text-slate-900 bg-transparent text-sm border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none cursor-pointer"
            >
              {COMMON_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              {!COMMON_LOCATIONS.includes(weather.location) && (
                <option value={weather.location}>{weather.location}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "success" : "info"}>
              {isLive ? "Live WeatherAPI" : "Mock Weather"}
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
          Real-time conditions influencing scheduled activity recommendations
        </CardDescription>
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
                isRainRisk ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {isRainRisk ? "Rain Inbound" : "Optimal Skies"}
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
