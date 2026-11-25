"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The page could not finish loading. This is usually a temporary database
        or weather-provider error.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-slate-400">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
