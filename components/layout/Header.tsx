"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Calendar, Bell, Settings } from "lucide-react";
import { formatFullDate } from "@/lib/utils";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  // Use client state for date to avoid hydration mismatches across server/client time zones
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setFormattedDate(formatFullDate(new Date()));
  }, []);

  useEffect(() => {
    let active = true;

    const loadUnread = async () => {
      try {
        const response = await fetch("/api/notifications?unread=1&limit=1");
        const json = await response.json();
        if (active && response.ok && json.success) {
          setUnreadCount(Number(json.unreadCount) || 0);
        }
      } catch {
        /* header is decorative; ignore transient failures */
      }
    };

    loadUnread();
    const timer = window.setInterval(loadUnread, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* Left section: Mobile menu button + Brand/App name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 lg:hidden"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900 sm:text-lg">
            Awarely
          </span>
          <span className="hidden text-slate-400 sm:inline">•</span>
          <span className="hidden text-sm font-medium text-slate-500 sm:inline">
            Life Context Assistant
          </span>
        </div>
      </div>

      {/* Right section: Current Date, Alerts, Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {unreadCount > 0 && (
          <Link
            href="/notifications"
            className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 md:flex"
          >
            <Bell className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {unreadCount} alert{unreadCount === 1 ? "" : "s"} need attention
            </span>
          </Link>
        )}

        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 sm:text-sm">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium">{formattedDate}</span>
          </div>
        )}

        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm ring-2 ring-white">
            AW
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
              title="Active"
            />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-medium text-slate-900 leading-tight">
              Personal Space
            </p>
            <p className="flex items-center gap-1 text-[10px] text-slate-400">
              <Settings className="h-2.5 w-2.5" />
              Settings
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
