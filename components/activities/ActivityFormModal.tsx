"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  ActivityCategory,
  ActivityStatus,
  ActivityValidationErrors,
  CreateActivityInput,
  UpdateActivityInput,
} from "@/types";
import { VALID_CATEGORIES, VALID_STATUSES } from "@/lib/validations/activity";
import { Sparkles, Calendar, Clock, AlertCircle } from "lucide-react";

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateActivityInput | UpdateActivityInput
  ) => Promise<void> | void;
  initialData?: Activity | null;
  isLoading?: boolean;
  serverError?: string | null;
}

export function ActivityFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
  serverError = null,
}: ActivityFormModalProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("household");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [status, setStatus] = useState<ActivityStatus>("pending");
  const [errors, setErrors] = useState<ActivityValidationErrors>({});

  // Helper to format an ISO string for input[type="datetime-local"]
  const toDateTimeLocal = (isoString?: string): string => {
    if (!isoString) {
      // Default to today at next rounded hour
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setCategory(initialData.category);
        setStartTime(toDateTimeLocal(initialData.startTime));
        setDurationMinutes(initialData.durationMinutes);
        setMonitoringEnabled(initialData.monitoringEnabled ?? true);
        setStatus(initialData.status);
      } else {
        // Reset to clean defaults
        setTitle("");
        setDescription("");
        setCategory("household");
        setStartTime(toDateTimeLocal());
        setDurationMinutes(60);
        setMonitoringEnabled(true);
        setStatus("pending");
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: ActivityValidationErrors = {};

    if (!title.trim()) {
      newErrors.title = "Activity title is required.";
    } else if (title.trim().length > 255) {
      newErrors.title = "Title cannot exceed 255 characters.";
    }

    if (!durationMinutes || durationMinutes <= 0 || !Number.isInteger(Number(durationMinutes))) {
      newErrors.durationMinutes = "Duration must be a positive integer.";
    } else if (durationMinutes > 1440) {
      newErrors.durationMinutes = "Duration cannot exceed 1440 minutes (24 hours).";
    }

    if (!startTime) {
      newErrors.startTime = "Start time is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert local datetime to ISO string
    let finalStartTime = startTime;
    const parsed = new Date(startTime);
    if (!isNaN(parsed.getTime())) {
      finalStartTime = parsed.toISOString();
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      category,
      startTime: finalStartTime,
      durationMinutes: Number(durationMinutes),
      monitoringEnabled,
      status,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={isEditing ? "Edit Activity" : "Create Context Activity"}
      description={
        isEditing
          ? "Update details or status for this tracked activity in the database."
          : "Add an activity. Awarely will monitor conditions during its scheduled window."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Activity Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Drying Clothes, Outdoor Run, Lawn Mowing"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-rose-600">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Description / Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Hang washing on backyard line"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Category & Status Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityCategory)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {VALID_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st === "in_progress"
                    ? "In Progress"
                    : st.charAt(0).toUpperCase() + st.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Time & Duration Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Start Date & Time <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (errors.startTime)
                    setErrors((prev) => ({ ...prev, startTime: undefined }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {errors.startTime && (
              <p className="mt-1 text-xs text-rose-600">{errors.startTime}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Duration (Minutes) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="5"
              step="5"
              required
              value={durationMinutes}
              onChange={(e) => {
                setDurationMinutes(Number(e.target.value));
                if (errors.durationMinutes)
                  setErrors((prev) => ({
                    ...prev,
                    durationMinutes: undefined,
                  }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.durationMinutes && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.durationMinutes}
              </p>
            )}
          </div>
        </div>

        {/* Monitoring Enabled Toggle */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={monitoringEnabled}
              onChange={(e) => setMonitoringEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800">
                Enable Context & Weather Monitoring
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When enabled, Awarely cross-references external forecasts with this activity’s time slot.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading}
          >
            {isLoading
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Create Activity"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
