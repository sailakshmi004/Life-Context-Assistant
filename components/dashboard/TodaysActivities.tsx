import React from "react";
import { Clock, ShieldAlert, Calendar, Plus, ShieldCheck, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusMenu } from "@/components/activities/StatusMenu";
import { Activity, ActivityStatus } from "@/types";
import { formatTimeDisplay } from "@/lib/utils";
import { ActivityListSkeleton } from "@/components/activities/ActivitySkeleton";

interface TodaysActivitiesProps {
  activities: Activity[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  headerAction?: React.ReactNode;
  onAddClick?: () => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  onStatusChange?: (id: string, newStatus: ActivityStatus) => Promise<void> | void;
}

export function TodaysActivities({
  activities,
  isLoading = false,
  title = "Tracked Activities",
  description = "Activities stored in PostgreSQL and tracked with context-aware conditions",
  emptyTitle = "No activities found",
  emptyDescription = "Start by scheduling an outdoor or household task like drying clothes or washing the car.",
  headerAction,
  onAddClick,
  onEdit,
  onDelete,
  onStatusChange,
}: TodaysActivitiesProps) {
  const getCategoryBadge = (category: Activity["category"]) => {
    const map: Record<
      string,
      { label: string; variant: "default" | "success" | "warning" | "neutral" | "info" }
    > = {
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <span className="text-xs font-semibold text-slate-500">
              {activities.length} shown
            </span>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <div className="flex-1">
        {isLoading ? (
          <ActivityListSkeleton count={4} />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">
              {emptyTitle}
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              {emptyDescription}
            </p>
            {onAddClick && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={onAddClick}
                className="mt-4"
              >
                Add Activity
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="group flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {activity.title}
                    </span>
                    {getCategoryBadge(activity.category)}
                    {activity.monitoringEnabled ? (
                      <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
                        <ShieldCheck className="h-3 w-3" />
                        Monitored
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        Off
                      </span>
                    )}
                    {activity.weatherAlertTriggered && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                        <ShieldAlert className="h-3 w-3" />
                        Weather Conflict
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeDisplay(activity.startTime)} ({activity.durationMinutes} mins)
                    </span>
                    {activity.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activity.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                  <StatusMenu
                    value={activity.status}
                    onChange={(status) => onStatusChange?.(activity.id, status)}
                    disabled={!onStatusChange}
                    activityTitle={activity.title}
                  />

                  {/* Actions */}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(activity)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-xs"
                      title="Edit activity"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(activity)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 text-xs"
                      title="Delete activity"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
