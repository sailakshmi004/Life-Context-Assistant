"use client";

import React from "react";
import { ActivityStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{
  value: ActivityStatus;
  label: string;
  description: string;
  dotClass: string;
}> = [
  {
    value: "pending",
    label: "Pending",
    description: "Not started yet",
    dotClass: "bg-slate-400",
  },
  {
    value: "in_progress",
    label: "In Progress",
    description: "Currently doing it",
    dotClass: "bg-sky-500",
  },
  {
    value: "completed",
    label: "Completed",
    description: "Already finished",
    dotClass: "bg-emerald-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description: "No longer needed",
    dotClass: "bg-slate-300",
  },
];

interface StatusPickerProps {
  value: ActivityStatus;
  onChange: (value: ActivityStatus) => void;
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STATUS_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-colors",
              selected
                ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", option.dotClass)}
              />
              <span className="text-[11px] font-semibold text-slate-800">
                {option.label}
              </span>
            </span>
            <span className="text-[10px] leading-tight text-slate-500">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
