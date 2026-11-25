"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { WelcomeBanner } from "./WelcomeBanner";
import { WeatherSummaryCard } from "./WeatherSummaryCard";
import { AttentionNeededSection } from "./AttentionNeededCard";
import { TodaysActivities } from "./TodaysActivities";
import { UpcomingReminders } from "./UpcomingReminders";
import { ActivityFormModal } from "@/components/activities/ActivityFormModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { fallbackWeather } from "@/lib/fallback-data";
import { isToday, formatTimeDisplay } from "@/lib/utils";
import {
  Activity,
  ActivityStatus,
  AppNotification,
  AttentionAlert,
  CreateActivityInput,
  Reminder,
  UpdateActivityInput,
  WeatherContextData,
} from "@/types";
import { Database, AlertCircle, RefreshCw, CloudSun, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";

function stripPrefix(title: string, prefix: string): string {
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

function alertsFromNotifications(
  items: AppNotification[],
  activeActivityIds: Set<string>
): AttentionAlert[] {
  return items
    .filter(
      (item) =>
        item.type === "weather_alert" &&
        Boolean(item.activityId) &&
        activeActivityIds.has(item.activityId as string)
    )
    .map((item) => ({
      id: item.id,
      activityId: item.activityId ?? "",
      activityTitle: stripPrefix(item.title, "Weather conflict: "),
      scheduledTime: item.scheduledFor
        ? formatTimeDisplay(item.scheduledFor)
        : "Scheduled window",
      severity: item.severity,
      reason: item.message,
      suggestion: item.suggestion ?? "",
    }));
}

function remindersFromNotifications(
  items: AppNotification[],
  activeActivityIds: Set<string>
): Reminder[] {
  const now = Date.now();
  return items
    .filter(
      (item) =>
        item.type === "reminder" &&
        Boolean(item.activityId) &&
        activeActivityIds.has(item.activityId as string) &&
        (!item.scheduledFor ||
          new Date(item.scheduledFor).getTime() >= now - 5 * 60 * 1000)
    )
    .map((item) => ({
      id: item.id,
      activityId: item.activityId ?? undefined,
      activityTitle: stripPrefix(item.title, "Starting soon: "),
      dueTime: item.scheduledFor ? formatTimeDisplay(item.scheduledFor) : "",
      message: item.message,
      priority: "high" as const,
      isWeatherAlert: false,
    }));
}

export function DashboardView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"today" | "all">("today");

  // Weather State
  const [selectedLocation, setSelectedLocation] = useState<string>("Hyderabad");
  const [weatherData, setWeatherData] = useState<WeatherContextData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWeather = useCallback(async (loc: string) => {
    setIsWeatherLoading(true);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setWeatherData(json.data);
      }
    } catch (err: unknown) {
      console.error("[DashboardView.fetchWeather] Error:", err);
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load activities from API");
      }
      setActivities(json.data || []);
      setIsLiveSupabase(Boolean(json.isLiveSupabase));
    } catch (err: unknown) {
      console.error("[DashboardView.fetchActivities] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsNotificationsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications(json.data || []);
      }
    } catch (err: unknown) {
      console.error("[DashboardView.fetchNotifications] Error:", err);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  const runSync = useCallback(async () => {
    try {
      await fetch("/api/notifications/sync", { method: "POST" });
    } catch (err: unknown) {
      console.error("[DashboardView.runSync] Error:", err);
    }
  }, []);

  // Bootstrap: settings → location → activities/weather/notifications → sync
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      let location = "Hyderabad";
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (res.ok && json.success && json.data?.defaultLocation) {
          location = json.data.defaultLocation as string;
        }
      } catch {
        /* fall back to default location */
      }

      if (cancelled) return;
      setSelectedLocation(location);

      await Promise.all([
        fetchActivities(),
        fetchWeather(location),
        fetchNotifications(),
      ]);

      await runSync();
      if (!cancelled) await fetchNotifications();
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchActivities, fetchWeather, fetchNotifications, runSync]);

  const activeActivityIds = useMemo(
    () =>
      new Set(
        activities
          .filter(
            (activity) =>
              activity.status !== "completed" && activity.status !== "cancelled"
          )
          .map((activity) => activity.id)
      ),
    [activities]
  );
  const alerts = useMemo(
    () => alertsFromNotifications(notifications, activeActivityIds),
    [notifications, activeActivityIds]
  );
  const reminders = useMemo(
    () => remindersFromNotifications(notifications, activeActivityIds),
    [notifications, activeActivityIds]
  );

  const visibleActivities = useMemo(
    () =>
      scope === "today"
        ? activities.filter((activity) => isToday(activity.startTime))
        : activities,
    [activities, scope]
  );
  const todayCount = useMemo(
    () => activities.filter((activity) => isToday(activity.startTime)).length,
    [activities]
  );

  // Handle Location Switch
  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
    fetchWeather(newLoc);
  };

  const refreshEverything = async () => {
    setError(null);
    await Promise.all([
      fetchActivities(),
      fetchWeather(selectedLocation),
      fetchNotifications(),
    ]);
    await runSync();
    await fetchNotifications();
  };

  // Handle Create or Update
  const handleFormSubmit = async (
    data: CreateActivityInput | UpdateActivityInput
  ) => {
    setIsSubmitting(true);
    setFormServerError(null);

    try {
      const isEdit = Boolean(selectedActivity);
      const res = await fetch(
        isEdit ? `/api/activities/${selectedActivity!.id}` : "/api/activities",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error ||
            (isEdit ? "Failed to update activity" : "Failed to create activity")
        );
      }

      setIsFormModalOpen(false);
      setSelectedActivity(null);
      await fetchActivities();
      await runSync();
      await fetchNotifications();
    } catch (err: unknown) {
      setFormServerError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (id: string, newStatus: ActivityStatus) => {
    try {
      setActivities((prev) =>
        prev.map((act) => (act.id === id ? { ...act, status: newStatus } : act))
      );

      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status");
      }
      await fetchActivities();
      await fetchNotifications();
    } catch (err: unknown) {
      console.error("[DashboardView.handleStatusChange] Error:", err);
      await fetchActivities();
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!activityToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/activities/${activityToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete activity");
      }
      setActivityToDelete(null);
      await fetchActivities();
      await fetchNotifications();
    } catch (err: unknown) {
      console.error("[DashboardView.handleConfirmDelete] Error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete activity");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== alertId));
    try {
      await fetch(`/api/notifications/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch (err: unknown) {
      console.error("[DashboardView.handleDismissAlert] Error:", err);
      await fetchNotifications();
    }
  };

  const activeWeather = weatherData?.current || fallbackWeather;

  const scopeToggle = (
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
      {(["today", "all"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setScope(option)}
          className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
            scope === option
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Service Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-600 shrink-0" />
            <span>
              Database:{" "}
              {isLiveSupabase ? (
                <span className="font-semibold text-emerald-700">
                  Supabase connected
                </span>
              ) : (
                <span className="font-medium text-amber-700">Unavailable</span>
              )}
            </span>
          </div>

          <div className="hidden sm:inline text-slate-300">•</div>

          <div className="flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-sky-600 shrink-0" />
            <span>
              Weather:{" "}
              {weatherData?.isLive ? (
                <span className="font-semibold text-emerald-700">
                  Live ({weatherData.location})
                </span>
              ) : (
                <span className="font-medium text-slate-500">
                  Fallback forecast
                </span>
              )}
            </span>
          </div>

          <div className="hidden sm:inline text-slate-300">•</div>

          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Alerts:{" "}
              <span className="font-semibold text-slate-800">
                {alerts.length}
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshEverything}
          disabled={isLoading || isWeatherLoading}
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 focus:outline-none disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isLoading || isWeatherLoading ? "animate-spin" : ""
            }`}
          />
          <span>Refresh all</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshEverything}
            className="text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      <WelcomeBanner
        onAddActivityClick={() => {
          setSelectedActivity(null);
          setIsFormModalOpen(true);
        }}
        activitiesCount={todayCount}
        alertsCount={alerts.length}
        rainChance={activeWeather.precipitationProbability}
      />

      <section aria-label="Attention Needed Section">
        <AttentionNeededSection
          alerts={alerts}
          isLoading={isNotificationsLoading}
          onAcknowledgeAlert={handleDismissAlert}
          onAdjustSchedule={(activityId) => {
            const activity = activities.find((item) => item.id === activityId);
            if (activity) {
              setSelectedActivity(activity);
              setIsFormModalOpen(true);
            }
          }}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <WeatherSummaryCard
            weather={activeWeather}
            isLive={weatherData?.isLive}
            onLocationChange={handleLocationChange}
            onRefresh={() => fetchWeather(selectedLocation)}
            isLoading={isWeatherLoading}
          />
        </div>

        <div className="lg:col-span-7">
          <TodaysActivities
            activities={visibleActivities}
            isLoading={isLoading}
            title={scope === "today" ? "Today's Activities" : "All Activities"}
            description={
              scope === "today"
                ? `${todayCount} scheduled today · ${activities.length} total tracked`
                : `${activities.length} tracked activities, sorted by start time`
            }
            emptyTitle={
              scope === "today"
                ? "Nothing scheduled for today"
                : "No activities found"
            }
            emptyDescription={
              scope === "today"
                ? "Switch to “All” to see future activities, or add something for today."
                : "Start by scheduling an outdoor or household task like drying clothes or washing the car."
            }
            headerAction={scopeToggle}
            onAddClick={() => {
              setSelectedActivity(null);
              setIsFormModalOpen(true);
            }}
            onEdit={(act) => {
              setSelectedActivity(act);
              setIsFormModalOpen(true);
            }}
            onDelete={(act) => setActivityToDelete(act)}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      <section aria-label="Upcoming Reminders Section">
        <UpcomingReminders
          reminders={reminders}
          isLoading={isNotificationsLoading}
        />
      </section>

      <ActivityFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedActivity(null);
          setFormServerError(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedActivity}
        isLoading={isSubmitting}
        serverError={formServerError}
      />

      <ConfirmationModal
        isOpen={Boolean(activityToDelete)}
        onClose={() => setActivityToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Activity"
        description={`Are you sure you want to delete "${activityToDelete?.title}"? This will permanently remove it from the database.`}
        confirmLabel="Delete Activity"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
