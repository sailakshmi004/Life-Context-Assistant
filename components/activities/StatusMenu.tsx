"use client";

import React from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ActivityStatus } from "@/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", dotClass: "bg-slate-400" },
  { value: "in_progress", label: "In Progress", dotClass: "bg-sky-500" },
  { value: "completed", label: "Completed", dotClass: "bg-emerald-500" },
  { value: "cancelled", label: "Cancelled", dotClass: "bg-slate-300" },
];

const BUTTON_CLASS: Record<ActivityStatus, string> = {
  pending: "border-slate-300 bg-slate-50 text-slate-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const DOT_CLASS: Record<ActivityStatus, string> = {
  pending: "bg-slate-400",
  in_progress: "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-300",
};

interface StatusMenuProps {
  value: ActivityStatus;
  onChange: (status: ActivityStatus) => void;
  disabled?: boolean;
  activityTitle?: string;
}

export function StatusMenu({
  value,
  onChange,
  disabled = false,
  activityTitle,
}: StatusMenuProps) {
  return (
    <SelectMenu
      value={value}
      options={STATUS_OPTIONS}
      onChange={(next) => onChange(next as ActivityStatus)}
      ariaLabel={
        activityTitle ? `Change status for ${activityTitle}` : "Activity status"
      }
      buttonClassName={BUTTON_CLASS[value]}
      selectedDotClass={DOT_CLASS[value]}
      menuClassName="w-44"
      align="right"
      size="sm"
      disabled={disabled}
    />
  );
}
