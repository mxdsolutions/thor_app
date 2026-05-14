"use client";

import * as React from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------- shared helpers ----------

function parseISODate(s: string): Date | null {
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDateDisplay(s: string, placeholder: string): string {
    const d = parseISODate(s);
    if (!d) return placeholder;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatTimeDisplay(s: string, placeholder: string): string {
    if (!s || !/^\d{2}:\d{2}$/.test(s)) return placeholder;
    const [h, m] = s.split(":").map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const period = h < 12 ? "AM" : "PM";
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

const triggerClass =
    "flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm cursor-pointer hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background data-[state=open]:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-50";

// ---------- DatePicker ----------

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function buildMonthGrid(viewYear: number, viewMonth: number): Date[] {
    // 6 weeks starting on Monday so a layout shift never happens between months.
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const dayOfWeek = (firstOfMonth.getDay() + 6) % 7; // Mon = 0
    const start = new Date(viewYear, viewMonth, 1 - dayOfWeek);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
}

export type DatePickerProps = {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
};

export function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const selected = parseISODate(value);
    const today = React.useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const initial = selected ?? today;
    const [viewYear, setViewYear] = React.useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = React.useState(initial.getMonth());

    React.useEffect(() => {
        if (open) {
            const focus = selected ?? today;
            setViewYear(focus.getFullYear());
            setViewMonth(focus.getMonth());
        }
    }, [open, selected, today]);

    const days = buildMonthGrid(viewYear, viewMonth);
    const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const stepMonth = (delta: number) => {
        let m = viewMonth + delta;
        let y = viewYear;
        while (m < 0) {
            m += 12;
            y -= 1;
        }
        while (m > 11) {
            m -= 12;
            y += 1;
        }
        setViewMonth(m);
        setViewYear(y);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(triggerClass, !selected && "text-muted-foreground", className)}
                >
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left truncate">
                        {formatDateDisplay(value, placeholder)}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" align="start" sideOffset={6}>
                <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => stepMonth(-1)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold">{monthLabel}</span>
                    <button
                        type="button"
                        onClick={() => stepMonth(1)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {WEEKDAY_LABELS.map((w) => (
                        <div
                            key={w}
                            className="text-[11px] font-medium text-muted-foreground text-center py-1"
                        >
                            {w}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                    {days.map((d) => {
                        const inMonth = d.getMonth() === viewMonth;
                        const isToday = d.getTime() === today.getTime();
                        const isSelected = !!selected && d.getTime() === selected.getTime();
                        return (
                            <button
                                key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                                type="button"
                                onClick={() => {
                                    onChange(toISODate(d));
                                    setOpen(false);
                                }}
                                className={cn(
                                    "h-8 w-full rounded-md text-sm flex items-center justify-center transition-colors",
                                    !inMonth && "text-muted-foreground/40",
                                    inMonth && !isSelected && "hover:bg-secondary",
                                    isSelected && "bg-foreground text-background font-semibold",
                                    !isSelected && isToday && "ring-1 ring-foreground/30"
                                )}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            onChange(toISODate(today));
                            setOpen(false);
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        Today
                    </button>
                    {selected && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ---------- TimePicker ----------

function buildTimes(stepMinutes: number): string[] {
    const times: string[] = [];
    for (let total = 0; total < 24 * 60; total += stepMinutes) {
        const h = Math.floor(total / 60);
        const m = total % 60;
        times.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
    return times;
}

export type TimePickerProps = {
    value: string; // HH:MM
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    /** Increment in minutes. Default 15. */
    step?: number;
    disabled?: boolean;
};

export function TimePicker({
    value,
    onChange,
    placeholder = "Select time",
    className,
    step = 15,
    disabled,
}: TimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const times = React.useMemo(() => buildTimes(step), [step]);
    const listRef = React.useRef<HTMLDivElement>(null);
    const selectedRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (!open) return;
        // Defer to after Radix mounts content + measures.
        const id = requestAnimationFrame(() => {
            if (selectedRef.current && listRef.current) {
                const list = listRef.current;
                const sel = selectedRef.current;
                list.scrollTop =
                    sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2;
            }
        });
        return () => cancelAnimationFrame(id);
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(triggerClass, !value && "text-muted-foreground", className)}
                >
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left truncate">
                        {formatTimeDisplay(value, placeholder)}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[140px] p-1" align="start" sideOffset={6}>
                <div ref={listRef} className="max-h-[260px] overflow-y-auto py-1">
                    {times.map((t) => {
                        const isSelected = t === value;
                        return (
                            <button
                                key={t}
                                ref={isSelected ? selectedRef : undefined}
                                type="button"
                                onClick={() => {
                                    onChange(t);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-sm tabular-nums transition-colors",
                                    isSelected
                                        ? "bg-foreground text-background font-semibold"
                                        : "hover:bg-secondary"
                                )}
                            >
                                {formatTimeDisplay(t, t)}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
