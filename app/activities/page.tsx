"use client";

import React, { useState } from "react";
import { Plus, CalendarCheck2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AddActivityModal } from "@/components/activities/AddActivityModal";
import { mockActivities } from "@/lib/mock-data";
import { Activity } from "@/types";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = (activity: Activity) => {
    setActivities((prev) => [activity, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Activities
          </h1>
          <p className="text-sm text-slate-500">
            Manage your daily tasks and their contextual weather conditions.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Activity
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-brand-600" />
            <CardTitle>All Tracked Activities</CardTitle>
          </div>
          <CardDescription>
            Showing {activities.length} activities with automated environmental monitoring.
          </CardDescription>
        </CardHeader>

        <div className="divide-y divide-slate-100">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {act.title}
                  </span>
                  <Badge variant="neutral" className="capitalize">
                    {act.category}
                  </Badge>
                  {act.weatherAlertTriggered && (
                    <Badge variant="danger" className="gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Weather Risk
                    </Badge>
                  )}
                </div>
                {act.description && (
                  <p className="text-xs text-slate-500">{act.description}</p>
                )}
                <div className="text-xs text-slate-400">
                  Scheduled for {act.startTime} ({act.durationMinutes} min)
                  {act.location ? ` • ${act.location}` : ""}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    act.status === "completed"
                      ? "success"
                      : act.status === "in_progress"
                      ? "info"
                      : "neutral"
                  }
                >
                  {act.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AddActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddActivity={handleAdd}
      />
    </div>
  );
}
