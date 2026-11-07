import React from "react";
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AttentionAlert } from "@/types";

interface AttentionNeededSectionProps {
  alerts: AttentionAlert[];
  onAcknowledgeAlert?: (id: string) => void;
}

export function AttentionNeededSection({
  alerts,
  onAcknowledgeAlert,
}: AttentionNeededSectionProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attention Needed</CardTitle>
          <CardDescription>
            Context conflicts detected between your activities and external conditions
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            No context conflicts detected
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            All your scheduled activities align well with current weather conditions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <CardTitle className="text-amber-900">Attention Needed</CardTitle>
          </div>
          <Badge variant="warning">{alerts.length} Pending Actions</Badge>
        </div>
        <CardDescription>
          External context conflicts detected. Action recommended before activities begin.
        </CardDescription>
      </CardHeader>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">
                  {alert.activityTitle}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <Clock className="h-3 w-3" />
                  {alert.scheduledTime}
                </span>
                <Badge
                  variant={alert.severity === "danger" ? "danger" : "warning"}
                  className="text-[10px] py-0 px-2"
                >
                  {alert.severity === "danger" ? "High Risk: Rain" : "Advisory"}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 font-normal">
                {alert.reason}
              </p>

              <p className="text-xs text-amber-800 font-medium bg-amber-50 rounded px-2 py-1 inline-block mt-1">
                💡 <span className="font-semibold">Suggestion:</span> {alert.suggestion}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcknowledgeAlert?.(alert.id)}
                className="text-xs"
              >
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Adjust Schedule
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
