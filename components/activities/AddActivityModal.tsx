"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Activity, ActivityCategory, ContextRuleType } from "@/types";
import { CloudRain, Sparkles } from "lucide-react";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddActivity: (activity: Activity) => void;
}

export function AddActivityModal({
  isOpen,
  onClose,
  onAddActivity,
}: AddActivityModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("household");
  const [startTime, setStartTime] = useState("2:00 PM");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState("");
  const [contextRule, setContextRule] = useState<ContextRuleType>("weather_rain");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      startTime: startTime.trim(),
      durationMinutes: Number(durationMinutes) || 60,
      location: location.trim() || undefined,
      contextRule,
      monitoringEnabled: contextRule === "weather_rain",
      status: "pending",
      weatherAlertTriggered: contextRule === "weather_rain",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddActivity(newActivity);
    // Reset form
    setTitle("");
    setDescription("");
    setLocation("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Context-Aware Activity"
      description="Add an activity to track. Awarely will monitor environmental conditions during its scheduled window."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Description / Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Put clothes on outdoor line"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Category & Location Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityCategory)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="household">Household (e.g. Laundry)</option>
              <option value="outdoor">Outdoor</option>
              <option value="fitness">Fitness / Running</option>
              <option value="work">Work & Focus</option>
              <option value="leisure">Leisure</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Location (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Backyard, Park"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Start Time & Duration Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Start Time
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="e.g. 2:00 PM"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Context Rule Selector */}
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <label className="text-xs font-semibold text-brand-900">
              Context Rule to Monitor
            </label>
          </div>
          <p className="mt-1 text-[11px] text-brand-700">
            Awarely cross-checks the weather forecast against this window.
          </p>

          <div className="mt-2.5 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="radio"
                name="contextRule"
                value="weather_rain"
                checked={contextRule === "weather_rain"}
                onChange={() => setContextRule("weather_rain")}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="flex items-center gap-1.5">
                <CloudRain className="h-3.5 w-3.5 text-brand-600" />
                Rain Alert Rule (Warn if rain is predicted)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="radio"
                name="contextRule"
                value="none"
                checked={contextRule === "none"}
                onChange={() => setContextRule("none")}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span>Standard reminder only (No weather check)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Activity
          </Button>
        </div>
      </form>
    </Modal>
  );
}
