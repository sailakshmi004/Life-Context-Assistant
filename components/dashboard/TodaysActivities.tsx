import React from "react";
import { Clock, ShieldAlert, CheckCircle2, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity } from "@/types";

interface TodaysActivitiesProps {
  activities: Activity[];
}

export function TodaysActivities({ activities }: TodaysActivitiesProps) {
  const getStatusBadge = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Scheduled</Badge>;
    }
  };

  const getCategoryBadge = (category: Activity["category"]) => {
    const map: Record<string, { label: string; variant: "default" | "success" | "warning" | "neutral" | "info" }> = {
      household: { label: "Household", variant: "default" },
      outdoor: { label: "Outdoor", variant: "warning" },
      fitness: { label: "Fitness", variant: "success" },
      work: { label: "Work", variant: "neutral" },
      leisure: { label: "Leisure", variant: "info" },
    };
    const info = map[category] || { label: category, variant: "neutral" };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            <CardTitle>Today&apos;s Activities</CardTitle>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {activities.length} total
          </span>
        </div>
        <CardDescription>
          Activities tracked with context-aware conditions
        </CardDescription>
      </CardHeader>

      <div className="divide-y divide-slate-100">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {activity.title}
                </span>
                {getCategoryBadge(activity.category)}
                {activity.weatherAlertTriggered && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    <ShieldAlert className="h-3 w-3" />
                    Weather Conflict
                  </span>
                )}
              </div>

              {activity.description && (
                <p className="text-xs text-slate-500">{activity.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activity.startTime} ({activity.durationMinutes} mins)
                </span>
                {activity.location && <span>• {activity.location}</span>}
                {activity.contextRule !== "none" && (
                  <span className="text-brand-600 font-medium">
                    • Rain Check Active
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
              {getStatusBadge(activity.status)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
