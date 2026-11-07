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
