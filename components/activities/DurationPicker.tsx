"use client";

import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { minutes: 30, label: "30m" },
  { minutes: 45, label: "45m" },
  { minutes: 60, label: "1h" },
  { minutes: 90, label: "1h 30m" },
  { minutes: 120, label: "2h" },
  { minutes: 180, label: "3h" },
  { minutes: 240, label: "4h" },
];

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  error?: string;
}

export function DurationPicker({ value, onChange, error }: DurationPickerProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700">
        Duration <span className="text-rose-500">*</span>
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            aria-pressed={value === preset.minutes}
            onClick={() => onChange(preset.minutes)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              value === preset.minutes
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {preset.label}
          </button>
        ))}

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
          <Clock className="h-3 w-3 text-slate-400" />
          <input
            id="activity-duration"
            type="number"
            min="5"
            step="5"
            aria-label="Custom duration in minutes"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "activity-duration-error" : undefined}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-14 bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none"
          />
          <span className="text-[10px] text-slate-400">min</span>
        </div>
      </div>
      {error && (
        <p id="activity-duration-error" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
