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
import {
  getRuleTypesForActivity,
  RULE_LABELS,
} from "@/lib/rules/registry";
import { Sparkles, Calendar, Clock, AlertCircle, MapPin } from "lucide-react";

const pad = (value: number) => value.toString().padStart(2, "0");

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats an ISO string for input[type="datetime-local"]. */
function toDateTimeLocal(isoString?: string): string {
  if (!isoString) {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return toLocalInputValue(date);
  }
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? "" : toLocalInputValue(date);
}

function addMinutes(value: string, minutes: number): string {
  const date = new Date(value);
  if (isNaN(date.getTime()) || !Number.isFinite(minutes)) return "";
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalInputValue(date);
}

function minutesBetween(start: string, end: string): number | null {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

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
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("household");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [status, setStatus] = useState<ActivityStatus>("pending");
  const [errors, setErrors] = useState<ActivityValidationErrors>({});

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const start = toDateTimeLocal(initialData.startTime);
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setLocation(initialData.location || "");
      setCategory(initialData.category);
      setStartTime(start);
      setDurationMinutes(initialData.durationMinutes);
      setEndTime(addMinutes(start, initialData.durationMinutes));
      setMonitoringEnabled(initialData.monitoringEnabled ?? true);
      setStatus(initialData.status);
    } else {
      const start = toDateTimeLocal();
      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("household");
      setStartTime(start);
      setDurationMinutes(60);
      setEndTime(addMinutes(start, 60));
      setMonitoringEnabled(true);
      setStatus("pending");
    }
    setErrors({});
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
    } else if (!endTime) {
      newErrors.startTime = "End time is required.";
    } else if (minutesBetween(startTime, endTime) === null) {
      newErrors.startTime = "Start and end time must be valid.";
    } else if (
      (minutesBetween(startTime, endTime) as number) <= 0
    ) {
      newErrors.startTime = "End time must be after start time.";
    }

    if (location.trim().length > 120) {
      newErrors.location = "Location cannot exceed 120 characters.";
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
      location: location.trim() || null,
      category,
      startTime: finalStartTime,
      durationMinutes: Number(durationMinutes),
      monitoringEnabled,
      status,
    });
  };

  const applicableRules = getRuleTypesForActivity({ title, category });

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
          <label
            htmlFor="activity-title"
            className="block text-xs font-semibold text-slate-700"
          >
            Activity Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="activity-title"
            type="text"
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "activity-title-error" : undefined}
            placeholder="e.g. Drying Clothes, Outdoor Run, Lawn Mowing"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.title && (
            <p id="activity-title-error" className="mt-1 text-xs text-rose-600">
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="activity-description"
            className="block text-xs font-semibold text-slate-700"
          >
            Description / Notes (Optional)
          </label>
          <textarea
            id="activity-description"
            rows={2}
            placeholder="e.g. Hang washing on backyard line"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="activity-location"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            Location (Optional)
          </label>
          <input
            id="activity-location"
            type="text"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={
              errors.location ? "activity-location-error" : undefined
            }
            placeholder="City, postcode, or lat,long — defaults to Settings"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location)
                setErrors((prev) => ({ ...prev, location: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.location && (
            <p
              id="activity-location-error"
              className="mt-1 text-xs text-rose-600"
            >
              {errors.location}
            </p>
          )}
        </div>

        {/* Category & Status Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="activity-category"
              className="block text-xs font-semibold text-slate-700"
            >
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              id="activity-category"
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
            <label
              htmlFor="activity-status"
              className="block text-xs font-semibold text-slate-700"
            >
              Status
            </label>
            <select
              id="activity-status"
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

        {/* Start / End / Duration Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="activity-start"
              className="block text-xs font-semibold text-slate-700"
            >
              Start Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="activity-start"
              type="datetime-local"
              required
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={
                errors.startTime ? "activity-start-error" : undefined
              }
              value={startTime}
              onChange={(e) => {
                const value = e.target.value;
                setStartTime(value);
                if (value) {
                  setEndTime(
                    addMinutes(
                      value,
                      durationMinutes > 0 ? durationMinutes : 60
                    )
                  );
                }
                if (errors.startTime)
                  setErrors((prev) => ({ ...prev, startTime: undefined }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.startTime && (
              <p id="activity-start-error" className="mt-1 text-xs text-rose-600">
                {errors.startTime}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="activity-end"
              className="block text-xs font-semibold text-slate-700"
            >
              End Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="activity-end"
              type="datetime-local"
              required
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={
                errors.startTime ? "activity-start-error" : undefined
              }
              value={endTime}
              onChange={(e) => {
                const value = e.target.value;
                setEndTime(value);
                const diff = minutesBetween(startTime, value);
                if (diff !== null && diff > 0) {
                  setDurationMinutes(diff);
                }
                if (errors.startTime)
                  setErrors((prev) => ({ ...prev, startTime: undefined }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="activity-duration"
              className="block text-xs font-semibold text-slate-700"
            >
              Duration (Minutes) <span className="text-rose-500">*</span>
            </label>
            <input
              id="activity-duration"
              type="number"
              min="5"
              step="5"
              required
              aria-invalid={Boolean(errors.durationMinutes)}
              aria-describedby={
                errors.durationMinutes ? "activity-duration-error" : undefined
              }
              value={durationMinutes}
              onChange={(e) => {
                const value = Number(e.target.value);
                setDurationMinutes(value);
                if (startTime && Number.isFinite(value) && value > 0) {
                  setEndTime(addMinutes(startTime, value));
                }
                if (errors.durationMinutes)
                  setErrors((prev) => ({
                    ...prev,
                    durationMinutes: undefined,
                  }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.durationMinutes && (
              <p
                id="activity-duration-error"
                className="mt-1 text-xs text-rose-600"
              >
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
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Weather checks:
                </span>
                {applicableRules.length > 0 ? (
                  applicableRules.map((rule) => (
                    <span
                      key={rule}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      {RULE_LABELS[rule]}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500">
                    none for this activity type
                  </span>
                )}
              </div>
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
