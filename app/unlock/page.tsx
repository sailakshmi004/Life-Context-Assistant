"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ArrowRight } from "lucide-react";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/unlock")) return "/dashboard";
  return raw;
}

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Unable to unlock the app.");
      }

      // Read the redirect target at submit time to avoid a mount-time race.
      const next = safeNextPath(
        new URLSearchParams(window.location.search).get("next")
      );
      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to unlock the app.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">
              Awarely
            </p>
            <p className="text-xs text-slate-500">Private workspace</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            Enter your passcode
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This site is private. Enter the passcode you configured for this
            deployment.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="passcode"
                className="block text-xs font-semibold text-slate-700"
              >
                Passcode
              </label>
              <input
                id="passcode"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={passcode}
                onChange={(event) => {
                  setPasscode(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !passcode.trim()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Unlocking…
                </>
              ) : (
                <>
                  Unlock
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Sessions last 30 days. You can lock the app again from Settings.
        </p>
      </div>
    </div>
  );
}
