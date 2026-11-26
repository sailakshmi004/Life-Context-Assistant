"use client";

import React from "react";
import {
  Car,
  Droplets,
  Footprints,
  Laptop,
  Shirt,
  Sparkles,
} from "lucide-react";
import { ActivityCategory } from "@/types";

export interface ActivityTemplate {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  durationMinutes: number;
  monitoringEnabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: "laundry",
    title: "Drying Clothes",
    description: "Hang laundry outdoors",
    category: "household",
    durationMinutes: 120,
    monitoringEnabled: true,
    icon: Shirt,
  },
  {
    id: "car",
    title: "Wash Car",
    description: "Hand-wash the vehicle",
    category: "outdoor",
    durationMinutes: 60,
    monitoringEnabled: true,
    icon: Car,
  },
  {
    id: "plants",
    title: "Water Plants",
    description: "Water the garden and pots",
    category: "household",
    durationMinutes: 30,
    monitoringEnabled: true,
    icon: Droplets,
  },
  {
    id: "run",
    title: "Outdoor Run",
    description: "Cardio session outside",
    category: "fitness",
    durationMinutes: 60,
    monitoringEnabled: true,
    icon: Footprints,
  },
  {
    id: "focus",
    title: "Deep Work",
    description: "Focused work block",
    category: "work",
    durationMinutes: 90,
    monitoringEnabled: false,
    icon: Laptop,
  },
];

interface ActivityTemplatePickerProps {
  onSelect: (template: ActivityTemplate) => void;
}

export function ActivityTemplatePicker({
  onSelect,
}: ActivityTemplatePickerProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        <span className="text-[11px] font-semibold text-slate-700">
          Quick start
        </span>
        <span className="text-[10px] text-slate-400">
          — pick a template or fill the form yourself
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ACTIVITY_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            >
              <Icon className="h-3.5 w-3.5 text-slate-400" />
              {template.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
