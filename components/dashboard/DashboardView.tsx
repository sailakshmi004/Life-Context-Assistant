"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WelcomeBanner } from "./WelcomeBanner";
import { WeatherSummaryCard } from "./WeatherSummaryCard";
import { AttentionNeededSection } from "./AttentionNeededCard";
import { TodaysActivities } from "./TodaysActivities";
import { UpcomingReminders } from "./UpcomingReminders";
import { ActivityFormModal } from "@/components/activities/ActivityFormModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { mockWeather, mockReminders } from "@/lib/mock-data";
import { evaluateActivityAgainstForecast } from "@/lib/rules/engine";
import {
  Activity,
  ActivityStatus,
  AttentionAlert,
  CreateActivityInput,
  Reminder,
  UpdateActivityInput,
  WeatherContextData,
} from "@/types";
import { Database, AlertCircle, RefreshCw, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DashboardView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<AttentionAlert[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 1. Fetch Weather from API
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

  // 2. Fetch activities from Next.js Route Handler
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

  // Initial load
  useEffect(() => {
    fetchActivities();
    fetchWeather(selectedLocation);
  }, [fetchActivities, fetchWeather, selectedLocation]);

  // Re-evaluate context rules when activities or weather data update
  useEffect(() => {
    if (!weatherData) return;

    const newAlerts: AttentionAlert[] = [];
    activities.forEach((act) => {
      if (act.status !== "completed" && act.status !== "cancelled") {
        const evalResult = evaluateActivityAgainstForecast(act, weatherData);
        if (evalResult.shouldAlert && evalResult.alert) {
          newAlerts.push({
            id: `alert-${act.id}`,
            ...evalResult.alert,
          });
        }
      }
    });
    setAlerts(newAlerts);
  }, [activities, weatherData]);

  // Handle Location Switch
  const handleLocationChange = (newLoc: string) => {
    setSelectedLocation(newLoc);
    fetchWeather(newLoc);
  };

  // Handle Create or Update
  const handleFormSubmit = async (
    data: CreateActivityInput | UpdateActivityInput
  ) => {
    setIsSubmitting(true);
    setFormServerError(null);

    try {
      if (selectedActivity) {
        // PATCH /api/activities/[id]
        const res = await fetch(`/api/activities/${selectedActivity.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to update activity");
        }
      } else {
        // POST /api/activities
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to create activity");
        }
      }

      setIsFormModalOpen(false);
      setSelectedActivity(null);
      await fetchActivities();
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
      // Optimistic local update
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
    } catch (err: unknown) {
      console.error("[DashboardView.handleStatusChange] Error:", err);
      await fetchActivities(); // Rollback on error
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
    } catch (err: unknown) {
      console.error("[DashboardView.handleConfirmDelete] Error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete activity");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const activeWeather = weatherData?.current || mockWeather;

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
                  Supabase PostgreSQL (Connected)
                </span>
              ) : (
                <span className="font-medium text-amber-700">
                  In-Memory Mock Store
                </span>
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
                  WeatherAPI Live ({weatherData.location})
                </span>
              ) : (
                <span className="font-medium text-slate-500">
                  Mock Forecast
                </span>
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchActivities();
            fetchWeather(selectedLocation);
          }}
          disabled={isLoading || isWeatherLoading}
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 focus:outline-none disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isLoading || isWeatherLoading ? "animate-spin" : ""
            }`}
          />
          <span>Refresh All</span>
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
            onClick={fetchActivities}
            className="text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 1. Welcome Message & Quick Status Banner */}
      <WelcomeBanner
        onAddActivityClick={() => {
          setSelectedActivity(null);
          setIsFormModalOpen(true);
        }}
        activitiesCount={activities.length}
        alertsCount={alerts.length}
        rainChance={activeWeather.precipitationProbability}
      />

      {/* 2. Attention-Needed Section */}
      <section aria-label="Attention Needed Section">
        <AttentionNeededSection
          alerts={alerts}
          onAcknowledgeAlert={handleDismissAlert}
        />
      </section>

      {/* 3. Core Grid: Weather Summary & Today's Activities */}
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
            activities={activities}
            isLoading={isLoading}
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

      {/* 4. Upcoming Reminders Section */}
      <section aria-label="Upcoming Reminders Section">
        <UpcomingReminders reminders={reminders} />
      </section>

      {/* Activity Create / Edit Modal */}
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

      {/* Delete Confirmation Modal */}
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
