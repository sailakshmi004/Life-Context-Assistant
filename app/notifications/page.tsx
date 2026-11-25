"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CloudRain,
  CloudOff,
  Clock,
  CheckCheck,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  Info,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppNotification } from "@/types";
import { formatRelativeTime, formatTimeDisplay } from "@/lib/utils";

type Filter = "all" | "unread" | "weather_alert" | "reminder";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "weather_alert", label: "Weather" },
  { id: "reminder", label: "Reminders" },
];

function severityVariant(severity: AppNotification["severity"]) {
  if (severity === "danger") return "danger" as const;
  if (severity === "warning") return "warning" as const;
  return "info" as const;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (clearError = true) => {
    setIsLoading(true);
    if (clearError) setError(null);
    try {
      const response = await fetch("/api/notifications");
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to load notifications");
      }
      setNotifications(json.data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const runSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications/sync", {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Alert check failed");
      }
      if (json.data?.locked) {
        setError("A notification sync is already running. Try again in a moment.");
        return;
      }
      await fetchNotifications(false);
      setError(json.data?.errors?.length ? json.data.errors[0] : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Alert check failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to mark notifications as read");
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark notifications as read"
      );
    }
  };

  const updateOne = async (
    id: string,
    patch: { isRead?: boolean; dismissed?: boolean }
  ) => {
    setBusyId(id);
    const previous = notifications;
    if (patch.dismissed) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } else if (typeof patch.isRead === "boolean") {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: patch.isRead! } : n))
      );
    }

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update notification");
      }
    } catch (err: unknown) {
      setNotifications(previous);
      setError(
        err instanceof Error ? err.message : "Failed to update notification"
      );
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    if (filter === "weather_alert") {
      return notifications.filter((n) =>
        ["weather_alert", "forecast_changed", "weather_resolved"].includes(
          n.type
        )
      );
    }
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="text-sm text-slate-500">
            Persisted weather conflicts and upcoming activity reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={runSync}
            disabled={isSyncing || isLoading}
            icon={
              isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )
            }
          >
            {isSyncing ? "Checking…" : "Check now"}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            icon={<CheckCheck className="h-4 w-4" />}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" />
              <CardTitle>Alert history</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="warning">{unreadCount} unread</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filter === item.id
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            Generated server-side by the context engine and delivered by the
            scheduler.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              {notifications.length === 0 ? (
                <BellOff className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {notifications.length === 0
                ? "No notifications yet"
                : "Nothing in this filter"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {notifications.length === 0
                ? "Alerts appear here when the forecast conflicts with a monitored activity. Use “Check now” to evaluate immediately."
                : "Try a different filter or mark everything as read."}
            </p>
            {notifications.length === 0 && (
              <Link
                href="/activities"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Add a monitored activity <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${
                  notification.isRead ? "opacity-70" : ""
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    notification.severity === "danger"
                      ? "bg-rose-50 text-rose-600"
                      : notification.severity === "warning"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-brand-50 text-brand-600"
                  }`}
                >
                  {notification.type === "weather_alert" ? (
                    <CloudRain className="h-4 w-4" />
                  ) : notification.type === "forecast_changed" ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : notification.type === "weather_resolved" ? (
                    <CloudOff className="h-4 w-4" />
                  ) : notification.type === "activity_completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : notification.type === "reminder" ? (
                    <Clock className="h-4 w-4" />
                  ) : notification.severity === "info" ? (
                    <Info className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {notification.title}
                    </span>
                    <Badge variant={severityVariant(notification.severity)}>
                      {notification.severity}
                    </Badge>
                    {!notification.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600">{notification.message}</p>

                  {notification.suggestion && (
                    <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      <span className="font-semibold">Suggestion:</span>{" "}
                      {notification.suggestion}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                    {notification.scheduledFor && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Scheduled {formatTimeDisplay(notification.scheduledFor)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateOne(notification.id, {
                        isRead: !notification.isRead,
                      })
                    }
                    disabled={busyId === notification.id}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    title={
                      notification.isRead ? "Mark as unread" : "Mark as read"
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateOne(notification.id, { dismissed: true })
                    }
                    disabled={busyId === notification.id}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-slate-400">
        Want these as browser notifications?{" "}
        <Link href="/settings" className="font-medium text-brand-700 hover:underline">
          Enable push in Settings
        </Link>
        .
      </p>
    </div>
  );
}
