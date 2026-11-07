import React from "react";
import { CloudSun, CloudRain, Droplets, Wind, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockWeather } from "@/lib/mock-data";

export const metadata = {
  title: "Weather Context — Awarely",
};

export default function WeatherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Weather Context
        </h1>
        <p className="text-sm text-slate-500">
          Real-time weather parameters used by Awarely&apos;s rules engine to evaluate outdoor activities.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <CloudSun className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Temperature</p>
              <p className="text-xl font-bold text-slate-900">{mockWeather.temperatureC}°C</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Feels like {mockWeather.feelsLikeC}°C</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <CloudRain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Precipitation Chance</p>
              <p className="text-xl font-bold text-rose-700">{mockWeather.precipitationProbability}%</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">High probability of rain this afternoon</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Wind className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Wind & Humidity</p>
              <p className="text-xl font-bold text-slate-900">{mockWeather.windSpeedKmh} km/h</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Humidity at {mockWeather.humidity}%</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Forecast Timeline & Context Impact</CardTitle>
            <Badge variant="warning">Rain Inbound</Badge>
          </div>
          <CardDescription>
            How the current forecast correlates with scheduled activities
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900">
                  Precipitation Window: 2:30 PM - 5:00 PM
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Scattered rain and cloudbursts are anticipated. Scheduled outdoor activities
                  (&quot;Drying Clothes&quot; and &quot;Hand-Wash Car&quot;) fall within this risk window.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Phase 1 Preview Note:</p>
            <p className="mt-1">
              Weather data is currently populated by structured mock data. In Phase 2, this will connect
              to WeatherAPI via server-side Route Handlers with automated caching.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
