import React from "react";

export function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="h-3 w-48 rounded bg-slate-100" />
      <div className="flex items-center gap-4 pt-1">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="h-3 w-20 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function ActivityListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ActivitySkeleton key={i} />
      ))}
    </div>
  );
}
