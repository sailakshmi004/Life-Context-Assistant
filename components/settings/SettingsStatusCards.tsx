import React from "react";
import { Database, ShieldCheck, Smartphone, Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppSettings } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

interface SystemStatusCardProps {
  settings: AppSettings;
  health: { database?: string } | null;
  pushConfigured: boolean;
  appUrl: string;
}

export function SystemStatusCard({
  settings,
  health,
  pushConfigured,
  appUrl,
}: SystemStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-brand-600" />
          <CardTitle>System status</CardTitle>
        </div>
        <CardDescription>
          Live view of the backend this deployment is using.
        </CardDescription>
      </CardHeader>

      <dl className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Database</dt>
          <dd>
            <Badge
              variant={health?.database === "connected" ? "success" : "warning"}
            >
              {health?.database ?? "unknown"}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Last alert check</dt>
          <dd>
            {settings.lastSyncAt ? (
              <Badge
                variant={
                  settings.lastSyncStatus === "error" ? "danger" : "success"
                }
              >
                {formatRelativeTime(settings.lastSyncAt)}
              </Badge>
            ) : (
              <Badge variant="neutral">Never</Badge>
            )}
          </dd>
        </div>
        {settings.lastSyncError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
            {settings.lastSyncError}
          </p>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Weather provider</dt>
          <dd>
            <Badge variant="info">WeatherAPI (with cache)</Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Push delivery</dt>
          <dd>
            <Badge variant={pushConfigured ? "success" : "neutral"}>
              {pushConfigured ? "VAPID configured" : "Disabled"}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">App URL</dt>
          <dd className="max-w-[60%] truncate font-mono text-[11px] text-slate-700">
            {appUrl}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

interface SecurityCardProps {
  onLock: () => void;
}

export function SecurityCard({ onLock }: SecurityCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <CardTitle>Access & security</CardTitle>
        </div>
        <CardDescription>
          This is a private single-user deployment.
        </CardDescription>
      </CardHeader>

      <div className="space-y-3 text-xs text-slate-600">
        <p className="flex items-start gap-2">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          The passcode gate protects every page and API route with a signed
          httpOnly cookie. Sessions last 30 days.
        </p>
        <p className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Database RLS is enabled with no public policies; only the server
          service-role key can read or write data.
        </p>

        <div className="border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLock}
            icon={<Lock className="h-3.5 w-3.5" />}
          >
            Lock app now
          </Button>
        </div>
      </div>
    </Card>
  );
}
