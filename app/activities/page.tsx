"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CalendarCheck2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ActivityItem } from "@/components/activities/ActivityItem";
import { ActivityFormModal } from "@/components/activities/ActivityFormModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ActivityListSkeleton } from "@/components/activities/ActivitySkeleton";
import {
  Activity,
  ActivityCategory,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";
import { VALID_CATEGORIES, VALID_STATUSES } from "@/lib/validations/activity";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  // Delete Confirmation State
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const url = `/api/activities?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch activities");
      }

      setActivities(json.data || []);
      setIsLiveSupabase(Boolean(json.isLiveSupabase));
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
          {isLiveSupabase ? (
            <span className="font-semibold text-emerald-700">
              Supabase PostgreSQL (Connected)
            </span>
          ) : (
            <span className="font-medium text-amber-700">
              In-Memory Mock Store (Add Supabase credentials to .env.local to persist)
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
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Category & Status Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Categories</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              {VALID_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st === "in_progress"
                    ? "In Progress"
                    : st.charAt(0).toUpperCase() + st.slice(1)}
                </option>
              ))}
            </select>

            {(selectedCategory !== "all" ||
              selectedStatus !== "all" ||
              searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="text-xs text-slate-500"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Activities List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-brand-600" />
              <CardTitle>Activities List</CardTitle>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {activities.length} {activities.length === 1 ? "item" : "items"}
            </span>
          </div>
          <CardDescription>
            All registered tasks with real-time editing, deletion, and status controls.
          </CardDescription>
        </CardHeader>

        {isLoading ? (
          <ActivityListSkeleton count={4} />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No activities found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                ? "No activities match your current search or filters. Try adjusting your search criteria."
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
            {activities.map((act) => (
              <ActivityItem
                key={act.id}
                activity={act}
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
