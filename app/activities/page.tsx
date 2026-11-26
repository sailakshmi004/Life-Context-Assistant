"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  CalendarCheck2,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ActivityItem } from "@/components/activities/ActivityItem";
import { ActivityFormModal } from "@/components/activities/ActivityFormModal";
import { ActivityDetailModal } from "@/components/activities/ActivityDetailModal";
import {
  ActivityFilters,
  type TimeScope,
} from "@/components/activities/ActivityFilters";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ActivityListSkeleton } from "@/components/activities/ActivitySkeleton";
import {
  Activity,
  ActivityFacets,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [facets, setFacets] = useState<ActivityFacets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeScope, setTimeScope] = useState<TimeScope>("all");

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // Delete Confirmation State
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch activities + filter facets from API
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const [activitiesResponse, facetsResponse] = await Promise.all([
        fetch(`/api/activities?${params.toString()}`),
        fetch("/api/activities/facets"),
      ]);

      const json = await activitiesResponse.json();
      if (!activitiesResponse.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch activities");
      }

      setActivities(json.data || []);
      setIsLiveSupabase(Boolean(json.isLiveSupabase));

      if (facetsResponse.ok) {
        const facetsJson = await facetsResponse.json();
        if (facetsJson.success) setFacets(facetsJson.data);
      }
    } catch (err: unknown) {
      console.error("[ActivitiesPage.fetchActivities] Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load activities"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // If a selected facet disappears (e.g. after deleting the last item),
  // fall back to "All" instead of showing an impossible filter.
  useEffect(() => {
    if (!facets) return;
    if (
      selectedCategory !== "all" &&
      facets.categories[selectedCategory as keyof ActivityFacets["categories"]] ===
        0
    ) {
      setSelectedCategory("all");
    }
    if (
      selectedStatus !== "all" &&
      facets.statuses[selectedStatus as keyof ActivityFacets["statuses"]] === 0
    ) {
      setSelectedStatus("all");
    }
  }, [facets, selectedCategory, selectedStatus]);

  const visibleActivities = useMemo(() => {
    if (timeScope === "all") return activities;
    const now = Date.now();
    return activities.filter((activity) => {
      const start = new Date(activity.startTime).getTime();
      if (Number.isNaN(start)) return false;
      const end = start + activity.durationMinutes * 60_000;
      return timeScope === "upcoming" ? end >= now : end < now;
    });
  }, [activities, timeScope]);

  const syncAlerts = useCallback(async () => {
    try {
      await fetch("/api/notifications/sync", { method: "POST" });
    } catch (err: unknown) {
      console.error("[ActivitiesPage.syncAlerts] Error:", err);
    }
  }, []);

  // Handle Create or Update
  const handleFormSubmit = async (
    data: CreateActivityInput | UpdateActivityInput
  ) => {
    setIsSubmitting(true);
    setFormServerError(null);

    try {
      if (selectedActivity) {
        // PATCH
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
        // POST
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
      await syncAlerts();
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
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
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
      await syncAlerts();
    } catch (err: unknown) {
      console.error("[ActivitiesPage.handleStatusChange] Error:", err);
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
      await syncAlerts();
    } catch (err: unknown) {
      console.error("[ActivitiesPage.handleConfirmDelete] Error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete activity");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Activities
          </h1>
          <p className="text-sm text-slate-500">
            Manage your daily tasks and automated context monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            }
            onClick={fetchActivities}
            disabled={isLoading}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setSelectedActivity(null);
              setIsFormModalOpen(true);
            }}
          >
            Add Activity
          </Button>
        </div>
      </div>

      {/* Database Connection Pill */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
        <Database className="h-4 w-4 text-brand-600 shrink-0" />
        <span>
          Backend:{" "}
          {isLoading ? (
            <span className="font-medium text-slate-500">Connecting…</span>
          ) : isLiveSupabase ? (
            <span className="font-semibold text-emerald-700">
              Supabase (Connected)
            </span>
          ) : (
            <span className="font-medium text-rose-700">
              Unavailable — check the server environment variables
            </span>
          )}
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivities}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <ActivityFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        timeScope={timeScope}
        onTimeScopeChange={setTimeScope}
        facets={facets}
        onReset={() => {
          setSelectedCategory("all");
          setSelectedStatus("all");
          setSearchQuery("");
          setTimeScope("all");
        }}
      />

      {/* Main Activities List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-brand-600" />
              <CardTitle>Activities List</CardTitle>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {isLoading ? "…" : visibleActivities.length}{" "}
              {!isLoading && (visibleActivities.length === 1 ? "item" : "items")}
            </span>
          </div>
          <CardDescription>
            All registered tasks with real-time editing, deletion, and status controls.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <ActivityListSkeleton count={4} />
        ) : visibleActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No activities found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {searchQuery ||
              selectedCategory !== "all" ||
              selectedStatus !== "all" ||
              timeScope !== "all"
                ? "No activities match your current search or filters. Try adjusting them."
                : "You haven't scheduled any activities yet. Click 'Add Activity' to get started."}
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setSelectedActivity(null);
                setIsFormModalOpen(true);
              }}
              className="mt-4"
            >
              Add Activity
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleActivities.map((act) => (
              <ActivityItem
                key={act.id}
                activity={act}
                onView={(activity) => setDetailActivity(activity)}
                onEdit={(activity) => {
                  setSelectedActivity(activity);
                  setIsFormModalOpen(true);
                }}
                onDelete={(activity) => setActivityToDelete(activity)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        isOpen={Boolean(detailActivity)}
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onEdit={(activity) => {
          setDetailActivity(null);
          setSelectedActivity(activity);
          setIsFormModalOpen(true);
        }}
        onDelete={(activity) => {
          setDetailActivity(null);
          setActivityToDelete(activity);
        }}
        onStatusChange={handleStatusChange}
      />

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
        description={`Are you sure you want to delete "${activityToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Activity"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
