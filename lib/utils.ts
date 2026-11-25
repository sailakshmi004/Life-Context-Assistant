import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes safely with clsx and twMerge.
 * Eliminates duplicate or conflicting utility classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date into a human-readable string.
 * Example: "Saturday, November 7, 2026"
 */
export function formatFullDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Formats time from an ISO string or time string.
 * Example: "2:00 PM"
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return "";
  // If it's already HH:MM AM/PM format, return it
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(timeStr)) {
    return timeStr;
  }
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    return timeStr;
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats an ISO timestamp as a short relative time (e.g. "5 min ago").
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of thresholds) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return formatter.format(diffSeconds, "second");
}

/**
 * Formats an ISO timestamp as a local date + time, e.g. "Nov 26, 2026, 2:00 PM".
 */
export function formatDateTimeDisplay(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Formats a duration in minutes as "1h 30m" / "45m".
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

/**
 * Returns true when the ISO timestamp falls on the viewer's current local day.
 */
export function isToday(isoString: string): boolean {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
