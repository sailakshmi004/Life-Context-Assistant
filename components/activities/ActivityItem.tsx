"use client";

import React, { useState } from "react";
import {
  Clock,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusMenu } from "@/components/activities/StatusMenu";
import { Activity, ActivityStatus } from "@/types";
import { formatTimeDisplay } from "@/lib/utils";

interface ActivityItemProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onView?: (activity: Activity) => void;
  onStatusChange?: (id: string, newStatus: ActivityStatus) => Promise<void> | void;
}

export function ActivityItem({
  activity,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
}: ActivityItemProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const formatSchedule = (isoOrTime: string, duration: number) => {
    const timeDisplay = formatTimeDisplay(isoOrTime);
    // If it's a valid date, show day as well
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      const isToday = new Date().toDateString() === d.toDateString();
      const datePrefix = isToday
        ? "Today"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${datePrefix} at ${timeDisplay} (${duration} mins)`;
    }
    return `${timeDisplay} (${duration} mins)`;
  };

  const handleStatusChange = async (newStatus: ActivityStatus) => {
    if (newStatus === activity.status) return;

    try {
      setIsUpdatingStatus(true);
      await onStatusChange?.(activity.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getCategoryVariant = (
    category: Activity["category"]
  ): "default" | "success" | "warning" | "neutral" | "info" => {
    switch (category) {
      case "household":
        return "default";
      case "outdoor":
        return "warning";
      case "fitness":
        return "success";
      case "work":
        return "neutral";
      default:
        return "info";
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left Details */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">
            {activity.title}
          </span>
          <Badge
            variant={getCategoryVariant(activity.category)}
            className="capitalize"
          >
            {activity.category}
          </Badge>

          {activity.monitoringEnabled ? (
            <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 border border-brand-200">
              <ShieldCheck className="h-3 w-3 text-brand-600" />
              Monitoring On
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              Monitoring Off
            </span>
          )}

          {activity.weatherAlertTriggered && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
              <ShieldAlert className="h-3 w-3 text-amber-600" />
              Rain Alert
            </span>
          )}
        </div>

        {activity.description && (
          <p className="text-xs text-slate-500 line-clamp-1">
            {activity.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{formatSchedule(activity.startTime, activity.durationMinutes)}</span>
          </div>
          {activity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {activity.location}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Status Selector & Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0 sm:justify-end shrink-0">
        {/* Status Menu */}
        <StatusMenu
          value={activity.status}
          onChange={handleStatusChange}
          disabled={isUpdatingStatus || !onStatusChange}
          activityTitle={activity.title}
        />

        {/* Action Buttons: View, Edit and Delete */}
        <div className="flex items-center gap-1">
          {onView && (
            <button
              type="button"
              onClick={() => onView(activity)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              title="View activity details"
              aria-label={`View ${activity.title} details`}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(activity)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            title="Edit activity"
            aria-label={`Edit ${activity.title}`}
          >
            <Edit2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(activity)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
            title="Delete activity"
            aria-label={`Delete ${activity.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
