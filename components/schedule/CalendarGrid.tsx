"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { getCalendarDays, getWeekDays, todayKey } from "@/lib/calendar-utils";
import type { CalendarDay } from "@/lib/calendar-utils";
import type { ScheduleEntry } from "./types";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export type CalendarView = "month" | "week";

function formatTime(time: string | null): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "pm" : "am";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m}${ampm}`;
}

function formatTimeRange(start: string | null, end: string | null): string {
    if (!start && !end) return "All day";
    if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
    if (start) return `From ${formatTime(start)}`;
    return `Until ${formatTime(end)}`;
}

interface CalendarGridProps {
    view: CalendarView;
    currentMonth: Date;
    weekStart: Date;
    selectedDate: string | null;
    entriesByDate: Map<string, ScheduleEntry[]>;
    statusConfig: Record<string, { label: string; color: string }>;
    onSelectDate: (dateKey: string) => void;
    onJobClick?: (entry: ScheduleEntry) => void;
    onEditEntry?: (entry: ScheduleEntry) => void;
    onDeleteEntry?: (entry: ScheduleEntry) => void;
    /** Called when clicking empty space in a week-view day column */
    onDateClick?: (dateKey: string) => void;
}

export function CalendarGrid({
    view,
    currentMonth,
    weekStart,
    selectedDate,
    entriesByDate,
    statusConfig,
    onSelectDate,
    onJobClick,
    onDateClick,
}: CalendarGridProps) {
    const days: CalendarDay[] =
        view === "month" ? getCalendarDays(currentMonth) : getWeekDays(weekStart);
    const today = todayKey();
    const isWeek = view === "week";

    if (isWeek) {
        return (
            <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Day-of-week header with dates */}
                <div className="grid grid-cols-7 bg-muted/30 border-b border-border divide-x divide-border">
                    {days.map((day, i) => {
                        const isToday = day.dateKey === today;
                        const isSelected = day.dateKey === selectedDate;
                        return (
                            <button
                                key={day.dateKey}
                                type="button"
                                onClick={() => onSelectDate(day.dateKey)}
                                className={cn(
                                    "py-2.5 px-1 text-center transition-colors",
                                    isSelected && "bg-primary/5",
                                )}
                            >
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    <span className="hidden sm:inline">{DAY_LABELS[i]}</span>
                                    <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
                                </span>
                                <span
                                    className={cn(
                                        "block text-sm mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full",
                                        isToday && "bg-foreground text-background font-semibold",
                                    )}
                                >
                                    {day.date.getDate()}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Week columns with job cards */}
                <div className="grid grid-cols-7 gap-px bg-border/30 flex-1 min-h-0">
                    {days.map((day) => {
                        const entries = entriesByDate.get(day.dateKey) || [];
                        const isToday = day.dateKey === today;
                        const isSelected = day.dateKey === selectedDate;

                        return (
                            <div
                                key={day.dateKey}
                                onClick={() => onDateClick?.(day.dateKey)}
                                className={cn(
                                    "bg-card p-1.5 flex flex-col gap-1.5 overflow-y-auto cursor-pointer hover:bg-muted/20 transition-colors",
                                    isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                                    isToday && !isSelected && "bg-primary/[0.02]",
                                )}
                            >
                                {entries.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground/40">—</span>
                                    </div>
                                )}
                                {entries.map((entry) => {
                                    const job = entry.job;
                                    const status = job?.status || "unknown";
                                    const statusInfo = statusConfig[status];
                                    const namedAssignees = (job?.assignees || []).filter(
                                        (a) => a.user.full_name,
                                    );

                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onJobClick?.(entry);
                                            }}
                                            className="w-full text-left rounded-md bg-blue-600 hover:bg-blue-700 p-2 transition-colors cursor-pointer group"
                                        >
                                            {/* Status + time */}
                                            <div className="flex items-center gap-1 mb-1">
                                                <div
                                                    className={cn(
                                                        "w-2 h-2 rounded-full shrink-0",
                                                        statusInfo?.color || "bg-gray-400",
                                                    )}
                                                />
                                                <span className="text-xs text-white/70 truncate">
                                                    {formatTimeRange(entry.start_time, entry.end_time)}
                                                </span>
                                            </div>

                                            {/* Job title */}
                                            <p className="text-sm font-medium truncate leading-tight text-white">
                                                {job?.job_title || "Untitled Job"}
                                            </p>

                                            {/* Bottom row: amount + assignees */}
                                            {((job?.amount ?? 0) > 0 || namedAssignees.length > 0) && (
                                                <div className="flex items-center justify-between mt-1.5 gap-1">
                                                    {(job?.amount ?? 0) > 0 ? (
                                                        <span className="text-xs font-medium tabular-nums text-white/80">
                                                            {formatCurrency(job!.amount)}
                                                        </span>
                                                    ) : (
                                                        <span />
                                                    )}
                                                    {namedAssignees.length > 0 && (
                                                        <div className="flex -space-x-1">
                                                            {namedAssignees.slice(0, 2).map((a) => (
                                                                <EntityPreviewCard key={a.user.id} entityType="user" entityId={a.user.id}>
                                                                    <div
                                                                        className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-blue-600"
                                                                        title={a.user.full_name || ""}
                                                                    >
                                                                        {a.user.full_name!
                                                                            .split(" ")
                                                                            .map((w) => w[0])
                                                                            .join("")
                                                                            .slice(0, 2)
                                                                            .toUpperCase()}
                                                                    </div>
                                                                </EntityPreviewCard>
                                                            ))}
                                                            {namedAssignees.length > 2 && (
                                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/70 ring-1 ring-blue-600">
                                                                    +{namedAssignees.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Month view (unchanged)
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
                                "p-1 sm:p-2 flex flex-col items-center gap-1 transition-colors min-h-[68px] sm:min-h-[84px]",
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

                            {entries.length > 0 && (
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
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
