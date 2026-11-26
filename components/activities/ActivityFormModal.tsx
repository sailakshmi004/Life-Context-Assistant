"use client";

import React, { useEffect, useState } from "react";
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
import {
  getRuleTypesForActivity,
  RULE_LABELS,
} from "@/lib/rules/registry";
import { CategoryPicker } from "./CategoryPicker";
import { DurationPicker } from "./DurationPicker";
import { StatusPicker } from "./StatusPicker";
import {
  ActivityTemplate,
  ActivityTemplatePicker,
} from "./ActivityTemplatePicker";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  formatDateTimeDisplay,
  formatDuration,
  formatTimeDisplay,
  isToday,
} from "@/lib/utils";

const pad = (value: number) => value.toString().padStart(2, "0");

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-brand-600" />
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
    </div>
  );
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

    if (
      !durationMinutes ||
      durationMinutes <= 0 ||
      !Number.isInteger(Number(durationMinutes))
    ) {
      newErrors.durationMinutes = "Duration must be a positive integer.";
    } else if (durationMinutes > 1440) {
      newErrors.durationMinutes =
        "Duration cannot exceed 1440 minutes (24 hours).";
    }

    if (!startTime) {
      newErrors.startTime = "Start time is required.";
    } else if (!endTime) {
      newErrors.startTime = "End time is required.";
    } else if (minutesBetween(startTime, endTime) === null) {
      newErrors.startTime = "Start and end time must be valid.";
    } else if ((minutesBetween(startTime, endTime) as number) <= 0) {
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

  const applyTemplate = (template: ActivityTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setCategory(template.category);
    setDurationMinutes(template.durationMinutes);
    setMonitoringEnabled(template.monitoringEnabled);
    if (startTime) {
      setEndTime(addMinutes(startTime, template.durationMinutes));
    }
    setErrors({});
  };

  const handleDurationChange = (minutes: number) => {
    const next = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
    setDurationMinutes(next);
    if (startTime && next > 0) {
      setEndTime(addMinutes(startTime, next));
    }
    if (errors.durationMinutes) {
      setErrors((prev) => ({ ...prev, durationMinutes: undefined }));
    }
  };

  const applicableRules = getRuleTypesForActivity({ title, category });

  const startLabel = startTime
    ? isToday(startTime)
      ? `Today, ${formatTimeDisplay(startTime)}`
      : formatDateTimeDisplay(startTime)
    : "";
  const endLabel = endTime
    ? isToday(endTime)
      ? formatTimeDisplay(endTime)
      : formatDateTimeDisplay(endTime)
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={isEditing ? "Edit Activity" : "Add Activity"}
      description={
        isEditing
          ? "Update the schedule, location, or status for this activity."
          : "Schedule something and Awarely will check the conditions during its window."
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        {!isEditing && <ActivityTemplatePicker onSelect={applyTemplate} />}

        {/* Activity details */}
        <section className="space-y-3">
          <SectionLabel icon={Sparkles} title="Activity" />

          <div>
            <label
              htmlFor="activity-title"
              className="block text-xs font-semibold text-slate-700"
            >
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              required
              autoFocus
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? "activity-title-error" : undefined
              }
              placeholder="e.g. Drying Clothes, Outdoor Run, Water Plants"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (errors.title)
                  setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.title && (
              <p id="activity-title-error" className="mt-1 text-xs text-rose-600">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="activity-description"
              className="block text-xs font-semibold text-slate-700"
            >
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="activity-description"
              rows={2}
              placeholder="Anything useful to remember about this task"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Category <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>

          <div>
            <label
              htmlFor="activity-location"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Location <span className="text-slate-400">(optional)</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="activity-location"
                type="text"
                aria-invalid={Boolean(errors.location)}
                aria-describedby={
                  errors.location ? "activity-location-error" : undefined
                }
                placeholder="City, postcode, or lat,long"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  if (errors.location)
                    setErrors((prev) => ({ ...prev, location: undefined }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation("")}
                  className="shrink-0 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                >
                  Use default
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Leave blank to use the default location from Settings.
            </p>
            {errors.location && (
              <p
                id="activity-location-error"
                className="mt-1 text-xs text-rose-600"
              >
                {errors.location}
              </p>
            )}
          </div>
        </section>

        {/* Schedule */}
        <section className="space-y-3 border-t border-slate-100 pt-4">
          <SectionLabel icon={CalendarClock} title="Schedule" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="activity-start"
                className="block text-xs font-semibold text-slate-700"
              >
                Starts <span className="text-rose-500">*</span>
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
                onChange={(event) => {
                  const value = event.target.value;
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
                Ends <span className="text-rose-500">*</span>
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
                onChange={(event) => {
                  const value = event.target.value;
                  setEndTime(value);
                  const diff = minutesBetween(startTime, value);
                  if (diff !== null && diff > 0) setDurationMinutes(diff);
                  if (errors.startTime)
                    setErrors((prev) => ({ ...prev, startTime: undefined }));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <DurationPicker
            value={durationMinutes}
            onChange={handleDurationChange}
            error={errors.durationMinutes}
          />

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {startLabel && endLabel
                ? `${startLabel} → ${endLabel} · ${formatDuration(
                    durationMinutes
                  )}`
                : "Choose a start and end time"}
            </span>
          </div>
        </section>

        {/* Monitoring */}
        <section className="border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={monitoringEnabled}
              onChange={(event) => setMonitoringEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-800">
                Weather monitoring
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Check the forecast during this activity&apos;s window and create
                alerts when conditions conflict.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Checks:
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
        </section>

        {isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Status
            </label>
            <div className="mt-1.5">
              <StatusPicker value={status} onChange={setStatus} />
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
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
            icon={
              isEditing ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )
            }
          >
            {isLoading
              ? "Saving…"
              : isEditing
              ? "Save changes"
              : "Create activity"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
