import React from "react";
import { Bell, Clock, CloudRain, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reminder } from "@/types";

interface UpcomingRemindersProps {
  reminders: Reminder[];
}

export function UpcomingReminders({ reminders }: UpcomingRemindersProps) {
  const getPriorityBadge = (priority: Reminder["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="danger">High</Badge>;
      case "medium":
        return <Badge variant="warning">Medium</Badge>;
      default:
        return <Badge variant="neutral">Normal</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-600" />
            <CardTitle>Upcoming Reminders</CardTitle>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {reminders.length} scheduled
          </span>
        </div>
        <CardDescription>
          Context alerts triggered based on live environmental changes
        </CardDescription>
      </CardHeader>

      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50/70"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {reminder.isWeatherAlert ? (
                <CloudRain className="h-4 w-4 text-brand-600" />
              ) : (
                <Clock className="h-4 w-4 text-slate-600" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  {reminder.activityTitle}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {reminder.dueTime}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {reminder.message}
              </p>

              <div className="flex items-center gap-2 pt-1">
                {getPriorityBadge(reminder.priority)}
                {reminder.isWeatherAlert && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    ⚡ Weather Alert Trigger
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
