"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck2,
  CloudSun,
  Bell,
  Settings,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface SidebarProps {
  onCloseMobile?: () => void;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: undefined,
  },
  {
    name: "Activities",
    href: "/activities",
    icon: CalendarCheck2,
    badge: undefined,
  },
  {
    name: "Weather",
    href: "/weather",
    icon: CloudSun,
    badge: undefined,
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: Bell,
    badge: undefined,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    badge: undefined,
  },
];

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/settings");
        const json = await response.json();
        if (active && response.ok && json.success) {
          setLastSyncAt(json.data.lastSyncAt ?? null);
          setLastSyncStatus(json.data.lastSyncStatus ?? null);
        }
      } catch {
        /* status widget is non-critical */
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const syncHealthy = lastSyncStatus !== "error";
  const statusLabel = lastSyncAt
    ? `Last check ${formatRelativeTime(lastSyncAt)}`
    : "Waiting for first check";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-slate-900">Awarely</span>
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
              v0.2
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Life Context Assistant</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Active if matches exactly or subpath (e.g. /dashboard or / if redirecting)
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-brand-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    isActive
                      ? "bg-brand-200 text-brand-800"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Context Engine Status / Footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-800">
              Context Engine
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Monitoring weather and external schedules automatically.
          </p>
          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 text-[11px] font-medium",
              syncHealthy ? "text-emerald-700" : "text-rose-700"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                syncHealthy ? "bg-emerald-500" : "bg-rose-500"
              )}
            />
            {statusLabel}
          </div>
        </div>
      </div>
    </aside>
  );
}
