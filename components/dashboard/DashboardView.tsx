"use client";

import React, { useState } from "react";
import { WelcomeBanner } from "./WelcomeBanner";
import { WeatherSummaryCard } from "./WeatherSummaryCard";
import { AttentionNeededSection } from "./AttentionNeededCard";
import { TodaysActivities } from "./TodaysActivities";
import { UpcomingReminders } from "./UpcomingReminders";
import { AddActivityModal } from "@/components/activities/AddActivityModal";
import {
  mockActivities,
  mockAttentionAlerts,
  mockReminders,
  mockWeather,
} from "@/lib/mock-data";
import { Activity, AttentionAlert, Reminder } from "@/types";

export function DashboardView() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [alerts, setAlerts] = useState<AttentionAlert[]>(mockAttentionAlerts);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddActivity = (newActivity: Activity) => {
    setActivities((prev) => [newActivity, ...prev]);

    // If context rule is weather_rain and rain chance is high, auto-generate an alert for preview
    if (
      newActivity.contextRule === "weather_rain" &&
      mockWeather.precipitationProbability >= 50
    ) {
      const newAlert: AttentionAlert = {
        id: `alert-${Date.now()}`,
        activityId: newActivity.id,
        activityTitle: newActivity.title,
        scheduledTime: `${newActivity.startTime} (${newActivity.durationMinutes} mins)`,
        severity: "danger",
        reason: `${mockWeather.precipitationProbability}% chance of rain forecasted during this window.`,
        suggestion: "Consider rescheduling or setting an indoor contingency.",
      };
      setAlerts((prev) => [newAlert, ...prev]);

      const newReminder: Reminder = {
        id: `rem-${Date.now()}`,
        activityId: newActivity.id,
        activityTitle: newActivity.title,
        dueTime: newActivity.startTime,
        message: `Rain alert: check forecast before starting ${newActivity.title}.`,
        priority: "high",
        isWeatherAlert: true,
      };
      setReminders((prev) => [newReminder, ...prev]);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcome Message & Quick Status Banner */}
      <WelcomeBanner
        onAddActivityClick={() => setIsAddModalOpen(true)}
        activitiesCount={activities.length}
        alertsCount={alerts.length}
        rainChance={mockWeather.precipitationProbability}
      />

      {/* 2. Attention-Needed Section (Prominent context conflicts) */}
      <section aria-label="Attention Needed Section">
        <AttentionNeededSection
          alerts={alerts}
          onAcknowledgeAlert={handleDismissAlert}
        />
      </section>

      {/* 3. Core Grid: Weather Summary & Today's Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weather Summary Placeholder Card (4 cols on desktop) */}
        <div className="lg:col-span-5">
          <WeatherSummaryCard weather={mockWeather} />
        </div>

        {/* Today's Activities Section (7 cols on desktop) */}
        <div className="lg:col-span-7">
          <TodaysActivities activities={activities} />
        </div>
      </div>

      {/* 4. Upcoming Reminders Section */}
      <section aria-label="Upcoming Reminders Section">
        <UpcomingReminders reminders={reminders} />
      </section>

      {/* Add Activity Modal Dialog */}
      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddActivity={handleAddActivity}
      />
    </div>
  );
}
