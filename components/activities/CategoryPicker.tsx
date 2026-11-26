"use client";

import React from "react";
import {
  Briefcase,
  Coffee,
  Dumbbell,
  Home,
  Trees,
} from "lucide-react";
import { ActivityCategory } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  household: {
    label: "Household",
    description: "Laundry, cleaning, plants",
    icon: Home,
  },
  outdoor: {
    label: "Outdoor",
    description: "Car, garden, yard work",
    icon: Trees,
  },
  fitness: {
    label: "Fitness",
    description: "Run, walk, cycling",
    icon: Dumbbell,
  },
  work: {
    label: "Work",
    description: "Focus and planning",
    icon: Briefcase,
  },
  leisure: {
    label: "Leisure",
    description: "Personal time",
    icon: Coffee,
  },
};

interface CategoryPickerProps {
  value: ActivityCategory;
  onChange: (value: ActivityCategory) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {(Object.keys(CATEGORY_META) as ActivityCategory[]).map((category) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        const selected = value === category;

        return (
          <button
            key={category}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(category)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-colors",
              selected
                ? "border-brand-300 bg-brand-50 text-brand-900 ring-1 ring-brand-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                selected ? "text-brand-600" : "text-slate-400"
              )}
            />
            <span className="text-[11px] font-semibold leading-tight">
              {meta.label}
            </span>
            <span className="text-[10px] leading-tight text-slate-500">
              {meta.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
