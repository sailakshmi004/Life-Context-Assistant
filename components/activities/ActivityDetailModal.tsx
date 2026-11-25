"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Clock,
  CalendarDays,
  Loader2,
  CloudRain,
  RefreshCw,
  CloudOff,
  CheckCircle2,
  Bell,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Activity, ActivityStatus, AppNotification } from "@/types";
import { getRuleTypesForActivity, RULE_LABELS } from "@/lib/rules/registry";
import {
  formatDateTimeDisplay,
  formatDuration,
  formatRelativeTime,
} from "@/lib/utils";

interface ActivityDetailModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onStatusChange: (
    id: string,
    status: ActivityStatus
  ) => Promise<void> | void;
}

const STATUS_VARIANT: Record<
  ActivityStatus,
  "default" | "success" | "warning" | "danger" | "info" | "neutral"
> = {
  pending: "neutral",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
};

function notificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "weather_alert":
      return <CloudRain className="h-3.5 w-3.5" />;
    case "forecast_changed":
      return <RefreshCw className="h-3.5 w-3.5" />;
    case "weather_resolved":
      return <CloudOff className="h-3.5 w-3.5" />;
    case "activity_completed":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "reminder":
      return <Clock className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

export function ActivityDetailModal({
  isOpen,
  activity,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: ActivityDetailModalProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!isOpen || !activity) return;

    let cancelled = false;
    setIsLoadingNotifications(true);
    setNotifications([]);

    fetch(
      `/api/notifications?activityId=${encodeURIComponent(
        activity.id
      )}&includeDismissed=1&limit=30`
    )
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json.success) setNotifications(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNotifications(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activity]);

  const ruleTypes = useMemo(() => {
    if (!activity) return [];
    return activity.ruleTypes ?? getRuleTypesForActivity(activity);
  }, [activity]);

  if (!activity) {
    return null;
  }

  const startMs = new Date(activity.startTime).getTime();
  const endIso = Number.isNaN(startMs)
    ? null
    : new Date(startMs + activity.durationMinutes * 60_000).toISOString();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      description="Activity schedule, weather checks, and notification history."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[activity.status]}>
            {activity.status === "in_progress"
              ? "In Progress"
              : activity.status.charAt(0).toUpperCase() +
                activity.status.slice(1)}
          </Badge>
          <Badge variant="default" className="capitalize">
            {activity.category}
          </Badge>
          {activity.monitoringEnabled ? (
            <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Monitoring on
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <ShieldOff className="h-3.5 w-3.5" />
              Monitoring off
            </span>
          )}
        </div>

        {activity.description && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            {activity.description}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Start
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {formatDateTimeDisplay(activity.startTime)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              End
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {endIso ? formatDateTimeDisplay(endIso) : "—"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Duration
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {formatDuration(activity.durationMinutes)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-900">
              {activity.location || "Default location from Settings"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-slate-500">
            Weather checks
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ruleTypes.length > 0 ? (
              ruleTypes.map((rule) => (
                <span
                  key={rule}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                >
                  {RULE_LABELS[rule]}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">
                No weather checks for this activity type.
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500">
              Notification history
            </p>
            <span className="text-[10px] text-slate-400">
              {notifications.length} item{notifications.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-500">
                No notifications for this activity yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5"
                >
                  <span className="mt-0.5 text-slate-500">
                    {notificationIcon(notification.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-800">
                      {notification.title}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {notification.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatRelativeTime(notification.createdAt)}
                      {notification.dismissedAt ? " · dismissed" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(activity)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            className="text-rose-600 hover:bg-rose-50"
          >
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(activity)}
            icon={<Pencil className="h-3.5 w-3.5" />}
          >
            Edit
          </Button>
          {activity.status !== "completed" && (
            <Button
              size="sm"
              onClick={async () => {
                await onStatusChange(activity.id, "completed");
                onClose();
              }}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Mark completed
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
