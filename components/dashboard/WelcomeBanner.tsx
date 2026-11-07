import React from "react";
import { Plus, AlertTriangle, CalendarDays, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WelcomeBannerProps {
  onAddActivityClick: () => void;
  activitiesCount: number;
  alertsCount: number;
  rainChance: number;
}

export function WelcomeBanner({
  onAddActivityClick,
  activitiesCount,
  alertsCount,
  rainChance,
}: WelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* Welcome Text */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Welcome back, Alex 👋
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Awarely is actively monitoring your schedule against real-world weather conditions.
          </p>

          {/* Quick Stats Pill Strip */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              <span>{activitiesCount} Activities Today</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-800 border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>{alertsCount} Attention Needed</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 font-medium text-sky-800 border border-sky-200">
              <CloudRain className="h-3.5 w-3.5 text-sky-600" />
              <span>{rainChance}% Rain Probability</span>
            </div>
          </div>
        </div>

        {/* Add Activity Action Button */}
        <div className="shrink-0">
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={onAddActivityClick}
            className="w-full sm:w-auto shadow"
          >
            Add Activity
          </Button>
        </div>
      </div>
    </div>
  );
}
