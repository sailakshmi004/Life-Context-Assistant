import React from "react";
import { CloudRain, Droplets, Wind, Thermometer, MapPin, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WeatherSummary } from "@/types";

interface WeatherSummaryCardProps {
  weather: WeatherSummary;
}

export function WeatherSummaryCard({ weather }: WeatherSummaryCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <CardTitle>{weather.location}</CardTitle>
          </div>
          <Badge variant="info">Context Source: WeatherAPI</Badge>
        </div>
        <CardDescription>
          External context conditions impacting your outdoor activities
        </CardDescription>
      </CardHeader>

      <div className="mt-2 space-y-4">
        {/* Main Temperature & Condition */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <CloudRain className="h-7 w-7" />
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
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700">
              <CloudRain className="h-3.5 w-3.5" />
              {weather.precipitationProbability}% Rain
            </span>
            <p className="mt-1 text-[11px] text-slate-400">Precipitation Chance</p>
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
              <span className="text-[11px] font-medium">Status</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              Rain Inbound
            </p>
          </div>
        </div>

        {/* Forecast advisory note */}
        {weather.forecastNote && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 p-3 text-xs text-amber-900 border border-amber-200/60">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">Context Advisory:</span> {weather.forecastNote}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
