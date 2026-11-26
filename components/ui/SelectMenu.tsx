"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
  dotClass?: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: "sm" | "md";
  align?: "left" | "right";
  selectedDotClass?: string;
  disabled?: boolean;
}

export function SelectMenu({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Select",
  className,
  buttonClassName,
  menuClassName,
  size = "sm",
  align = "left",
  selectedDotClass,
  disabled = false,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="option"]:not([disabled])')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]:not([disabled])'
      ) ?? []
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = 0;

    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "ArrowDown")
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    else if (event.key === "ArrowUp")
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;

    items[nextIndex]?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${menuId}-menu` : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (
            event.key === "ArrowDown" ||
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
          buttonClassName
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selectedDotClass && (
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selectedDotClass)}
            />
          )}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={`${menuId}-menu`}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "absolute z-30 mt-1 max-h-64 min-w-[11rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:pointer-events-none disabled:opacity-40",
                  active
                    ? "bg-brand-50 font-semibold text-brand-800"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {option.dotClass && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        option.dotClass
                      )}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                  {typeof option.count === "number" && (
                    <span className="text-[10px] font-normal text-slate-400">
                      {option.count}
                    </span>
                  )}
                </span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
