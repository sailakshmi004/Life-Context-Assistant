import React from "react";
import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Compass className="h-6 w-6" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        404
      </p>
      <h1 className="mt-1 text-lg font-semibold text-slate-900">
        This page does not exist
      </h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        The link may be outdated, or the activity it pointed to was deleted.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
      >
        <LayoutDashboard className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
