"use client";

import React from "react";
import { Search, Filter, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ActivityFacets } from "@/types";
import { VALID_CATEGORIES, VALID_STATUSES } from "@/lib/validations/activity";

export type TimeScope = "all" | "upcoming" | "past";

interface ActivityFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  timeScope: TimeScope;
  onTimeScopeChange: (value: TimeScope) => void;
  facets: ActivityFacets | null;
  onReset: () => void;
}

function titleCase(value: string): string {
  return value === "in_progress"
    ? "In Progress"
    : value.charAt(0).toUpperCase() + value.slice(1);
}

export function ActivityFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  timeScope,
  onTimeScopeChange,
  facets,
  onReset,
}: ActivityFiltersProps) {
  const hasFilters =
    Boolean(searchQuery) ||
    selectedCategory !== "all" ||
    selectedStatus !== "all" ||
    timeScope !== "all";

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, or location..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
              {(["all", "upcoming", "past"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => onTimeScopeChange(scope)}
                  className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                    timeScope === scope
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">
                All Categories{facets ? ` (${facets.total})` : ""}
              </option>
              {VALID_CATEGORIES.map((category) => {
                const count = facets?.categories[category] ?? 0;
                return (
                  <option
                    key={category}
                    value={category}
                    disabled={count === 0}
                  >
                    {titleCase(category)}
                    {facets ? ` (${count})` : ""}
                  </option>
                );
              })}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => onStatusChange(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              {VALID_STATUSES.map((status) => {
                const count = facets?.statuses[status] ?? 0;
                return (
                  <option key={status} value={status} disabled={count === 0}>
                    {titleCase(status)}
                    {facets ? ` (${count})` : ""}
                  </option>
                );
              })}
            </select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs text-slate-500"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
