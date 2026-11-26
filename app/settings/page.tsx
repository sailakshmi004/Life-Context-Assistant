"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  MapPin,
  Bell,
  BellRing,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  SecurityCard,
  SystemStatusCard,
} from "@/components/settings/SettingsStatusCards";
import { AppSettings } from "@/types";
import {
  getPushState,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from "@/lib/push/client";

type Message = { type: "success" | "error"; text: string } | null;

interface HealthInfo {
  status: string;
  database: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [isTestBusy, setIsTestBusy] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [appUrl, setAppUrl] = useState("—");

  const load = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [settingsRes, state] = await Promise.all([
        fetch("/api/settings").then((res) => res.json().then((json) => ({ res, json }))),
        getPushState(),
        fetch("/api/health")
          .then((res) => res.json())
          .then((json) => setHealth(json))
          .catch(() => setHealth(null)),
      ]);

      if (!settingsRes.res.ok || !settingsRes.json.success) {
        throw new Error(settingsRes.json.error || "Failed to load settings");
      }

      setSettings(settingsRes.json.data);
      setPushConfigured(Boolean(settingsRes.json.pushConfigured));
      setPushState(state);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load settings",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPushSupported(isPushSupported());
    setAppUrl(window.location.origin);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (patch: Partial<AppSettings>) => {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || "Failed to save settings");
    }
    setSettings(json.data);
    return json.data as AppSettings;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings || isSaving) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await saveSettings({
        defaultLocation: settings.defaultLocation.trim(),
        notificationsEnabled: settings.notificationsEnabled,
      });
      setMessage({ type: "success", text: "Settings saved." });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (!settings || isPushBusy) return;
    setIsPushBusy(true);
    setMessage(null);

    try {
      const subscribed = pushState?.subscribed;
      const result = subscribed ? await unsubscribeFromPush() : await subscribeToPush();
      if (!result.ok) {
        setMessage({ type: "error", text: result.message });
        return;
      }

      await saveSettings({ pushEnabled: !subscribed });
      setPushState(await getPushState());
      setMessage({ type: "success", text: result.message });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Failed to update push notifications",
      });
    } finally {
      setIsPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Test notification failed");
      }
      setMessage({
        type: json.data?.sent > 0 ? "success" : "error",
        text: json.message || "Test notification request completed.",
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Test notification failed",
      });
    } finally {
      setIsTestBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/notifications/sync", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Sync failed");
      }
      if (json.data?.locked) {
        setMessage({
          type: "error",
          text: "A notification sync is already running. Try again in a moment.",
        });
        return;
      }
      const {
        created,
        resolved,
        forecastChanges,
        pushed,
        evaluatedActivities,
        errors,
      } = json.data;
      const summary = `Checked ${evaluatedActivities} activities — ${created} new alert${
        created === 1 ? "" : "s"
      }, ${resolved} resolved, ${forecastChanges} forecast change${
        forecastChanges === 1 ? "" : "s"
      }, ${pushed} push notification${pushed === 1 ? "" : "s"} sent.`;
      setMessage({
        type: errors?.length ? "error" : "success",
        text: errors?.length ? `${summary} ${errors[0]}` : summary,
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLock = async () => {
    await fetch("/api/auth/lock", { method: "POST" });
    router.replace("/unlock");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-slate-500">
          Preferences, browser notifications, and deployment diagnostics.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-4 text-xs ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          {message.type === "error" && !settings && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={load}
              className="shrink-0 bg-white"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Location & generation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" />
                <CardTitle>Context defaults</CardTitle>
              </div>
              <CardDescription>
                Used when an activity does not specify its own location.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Default location
                </label>
                <input
                  type="text"
                  value={settings.defaultLocation}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      defaultLocation: event.target.value,
                    })
                  }
                  placeholder="e.g. Hyderabad, London, 17.385,78.4867"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  City name, postcode, or latitude,longitude.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      notificationsEnabled: event.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">
                    Generate context alerts
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Evaluate monitored activities against the forecast and store
                    alerts.
                  </span>
                </span>
              </label>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  icon={
                    isSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {isSyncing ? "Checking…" : "Run alert check now"}
                </Button>

                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Push notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-brand-600" />
                  <CardTitle>Browser notifications</CardTitle>
                </div>
                <Badge
                  variant={
                    pushState?.subscribed
                      ? "success"
                      : pushConfigured
                      ? "info"
                      : "neutral"
                  }
                >
                  {pushState?.subscribed
                    ? "Enabled"
                    : pushConfigured
                    ? "Available"
                    : "Not configured"}
                </Badge>
              </div>
              <CardDescription>
                Get weather conflicts and reminders even when Awarely is closed.
              </CardDescription>
            </CardHeader>

            <div className="space-y-3 text-xs text-slate-600">
              {pushSupported === false && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  This browser does not expose the Push API. On iPhone/iPad,
                  install the site to your Home Screen first (iOS 16.4+).
                </div>
              )}

              {!pushConfigured && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Server VAPID keys are missing. Add{" "}
                  <code className="rounded bg-white/70 px-1">
                    VAPID_PUBLIC_KEY
                  </code>
                  ,{" "}
                  <code className="rounded bg-white/70 px-1">VAPID_PRIVATE_KEY</code>{" "}
                  and{" "}
                  <code className="rounded bg-white/70 px-1">VAPID_SUBJECT</code>{" "}
                  to the environment.
                </div>
              )}

              {pushState?.permission === "denied" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                  <p className="font-semibold">Notifications are blocked</p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Click the padlock/tune icon in your browser’s address bar →
                    Notifications → Allow, then reload this page. On iPhone,
                    install the site to your Home Screen first.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    Permission: {pushState?.permission ?? "unknown"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Requires HTTPS (or localhost).
                  </p>
                </div>
                <Button
                  type="button"
                  variant={pushState?.subscribed ? "outline" : "primary"}
                  size="sm"
                  onClick={handlePushToggle}
                  disabled={
                    isPushBusy || !pushSupported || !pushConfigured
                  }
                  icon={
                    isPushBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {pushState?.subscribed ? "Disable" : "Enable"}
                </Button>
              </div>

              {pushState?.subscribed && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Verify delivery
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Sends a notification to every subscribed device.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleTestPush}
                    disabled={isTestBusy || !pushConfigured}
                    icon={
                      isTestBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <BellRing className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    Send test
                  </Button>
                </div>
              )}

              {!settings.notificationsEnabled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Alert generation is currently off. Turn on{" "}
                  <span className="font-semibold">Generate context alerts</span>{" "}
                  above so the scheduler has notifications to deliver.
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                The background scheduler runs every 10 minutes. Keep the server
                running for reliable delivery.
              </p>
            </div>
          </Card>

          <SystemStatusCard
            settings={settings}
            health={health}
            pushConfigured={pushConfigured}
            appUrl={appUrl}
          />

          <SecurityCard onLock={handleLock} />

          <div className="lg:col-span-2 flex items-center gap-2 text-[11px] text-slate-400">
            <SettingsIcon className="h-3.5 w-3.5" />
            Awarely v0.2 · Self-hosted · Next.js 14
          </div>
        </form>
      )}
    </div>
  );
}
