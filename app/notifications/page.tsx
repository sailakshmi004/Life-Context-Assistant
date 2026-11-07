import React from "react";
import { Bell, CloudRain, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockReminders } from "@/lib/mock-data";

export const metadata = {
  title: "Notifications — Awarely",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notifications & Alerts
        </h1>
        <p className="text-sm text-slate-500">
          History of context-triggered warnings, weather alerts, and activity reminders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-600" />
            <CardTitle>Recent Notifications</CardTitle>
          </div>
          <CardDescription>
            Alerts triggered when environmental conditions changed
          </CardDescription>
        </CardHeader>

        <div className="divide-y divide-slate-100">
          {mockReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                {reminder.isWeatherAlert ? (
                  <CloudRain className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {reminder.activityTitle}
                  </span>
                  <span className="text-xs text-slate-400">
                    {reminder.dueTime}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{reminder.message}</p>
                <div className="pt-1">
                  <Badge
                    variant={reminder.priority === "high" ? "danger" : "neutral"}
                    className="text-[10px]"
                  >
                    Priority: {reminder.priority}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
