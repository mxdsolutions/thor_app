"use client";

import { cn } from "@/lib/utils";
import { getCalendarDays, getWeekDays, todayKey } from "@/lib/calendar-utils";
import type { CalendarDay } from "@/lib/calendar-utils";
import type { ScheduleEntry } from "./types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export type CalendarView = "month" | "week";

interface CalendarGridProps {
    view: CalendarView;
    currentMonth: Date;
    weekStart: Date;
    selectedDate: string | null;
    entriesByDate: Map<string, ScheduleEntry[]>;
    statusConfig: Record<string, { label: string; color: string }>;
    onSelectDate: (dateKey: string) => void;
}

export function CalendarGrid({
    view,
    currentMonth,
    weekStart,
    selectedDate,
    entriesByDate,
    statusConfig,
    onSelectDate,
}: CalendarGridProps) {
    const days: CalendarDay[] =
        view === "month" ? getCalendarDays(currentMonth) : getWeekDays(weekStart);
    const today = todayKey();
    const isWeek = view === "week";

    return (
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 bg-muted/30">
                {DAY_LABELS.map((label, i) => (
                    <div
                        key={label + i}
                        className="py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-border/30">
                {days.map((day) => {
                    const entries = entriesByDate.get(day.dateKey) || [];
                    const isToday = day.dateKey === today;
                    const isSelected = day.dateKey === selectedDate;

                    // Collect unique statuses for dot indicators
                    const uniqueStatuses = [
                        ...new Set(entries.map((e) => e.job?.status).filter(Boolean)),
                    ].slice(0, 3) as string[];

                    return (
                        <button
                            key={day.dateKey}
                            type="button"
                            onClick={() => onSelectDate(day.dateKey)}
                            className={cn(
                                "p-1 sm:p-2 flex flex-col items-center gap-1 transition-colors",
                                isWeek ? "min-h-[100px] sm:min-h-[120px]" : "min-h-[68px] sm:min-h-[84px]",
                                day.isCurrentMonth
                                    ? "bg-card hover:bg-muted/30"
                                    : "bg-card/50 text-muted-foreground/40 hover:bg-muted/20",
                                isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                            )}
                        >
                            <span
                                className={cn(
                                    "text-xs sm:text-sm w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
                                    isToday &&
                                        "bg-primary text-primary-foreground font-semibold",
                                )}
                            >
                                {day.date.getDate()}
                            </span>

                            {/* In week view, show entry summaries instead of just dots */}
                            {isWeek && entries.length > 0 ? (
                                <div className="w-full space-y-0.5 mt-0.5">
                                    {entries.slice(0, 3).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={cn(
                                                "text-[10px] leading-tight truncate rounded px-1 py-0.5",
                                                statusConfig[entry.job?.status || ""]?.color
                                                    ? "text-white"
                                                    : "bg-muted text-muted-foreground",
                                            )}
                                            style={
                                                statusConfig[entry.job?.status || ""]?.color
                                                    ? undefined
                                                    : undefined
                                            }
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle",
                                                    statusConfig[entry.job?.status || ""]?.color || "bg-gray-400",
                                                )}
                                            />
                                            <span className="text-foreground/80">
                                                {entry.job?.description || "Job"}
                                            </span>
                                        </div>
                                    ))}
                                    {entries.length > 3 && (
                                        <span className="text-[9px] text-muted-foreground">
                                            +{entries.length - 3} more
                                        </span>
                                    )}
                                </div>
                            ) : entries.length > 0 ? (
                                <div className="flex items-center gap-0.5">
                                    {uniqueStatuses.map((status) => (
                                        <div
                                            key={status}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                statusConfig[status]?.color || "bg-gray-400",
                                            )}
                                        />
                                    ))}
                                    {entries.length > 3 && (
                                        <span className="text-[9px] text-muted-foreground ml-0.5">
                                            +{entries.length - 3}
                                        </span>
                                    )}
                                </div>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
