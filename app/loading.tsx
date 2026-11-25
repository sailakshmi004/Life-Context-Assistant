import React from "react";
import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      <p className="text-sm font-medium">Loading Awarely…</p>
    </div>
  );
}
