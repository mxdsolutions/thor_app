"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ScheduleEntry } from "./types";

interface DayDetailListProps {
    entries: ScheduleEntry[];
    dateLabel: string;
    statusConfig: Record<string, { label: string; color: string }>;
    onJobClick: (entry: ScheduleEntry) => void;
    onEditEntry: (entry: ScheduleEntry) => void;
    onDeleteEntry: (entry: ScheduleEntry) => void;
    loading?: boolean;
}

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

export function DayDetailList({
    entries,
    dateLabel,
    statusConfig,
    onJobClick,
    onEditEntry,
    onDeleteEntry,
    loading,
}: DayDetailListProps) {
    return (
        <div>
            {/* Section header */}
            <div className="flex items-center justify-between pb-3">
                <h2 className="text-sm font-semibold">{dateLabel}</h2>
                <Badge variant="secondary" className="rounded-full">
                    {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </Badge>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground rounded-2xl border border-dashed border-border/50">
                    No jobs scheduled for this day.
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => {
                        const job = entry.job;
                        const status = job?.status || "unknown";
                        const statusInfo = statusConfig[status];
                        const assignees = job?.assignees || [];

                        return (
                            <div
                                key={entry.id}
                                className="rounded-2xl border bg-card shadow-sm p-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                                onClick={() => onJobClick(entry)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className={cn(
                                                    "w-2 h-2 rounded-full shrink-0",
                                                    statusInfo?.color || "bg-gray-400",
                                                )}
                                            />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {statusInfo?.label || status}
                                            </span>
                                            <span className="text-xs text-muted-foreground/60">
                                                {formatTimeRange(entry.start_time, entry.end_time)}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-sm truncate">
                                            {job?.job_title || "Untitled Job"}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {job?.company && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {job.company.name}
                                                </span>
                                            )}
                                            {entry.notes && (
                                                <span className="text-xs text-muted-foreground/60 italic truncate">
                                                    {entry.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Amount */}
                                        {(job?.amount ?? 0) > 0 && (
                                            <span className="text-sm font-medium tabular-nums">
                                                {formatCurrency(job!.amount)}
                                            </span>
                                        )}

                                        {/* Assignee avatars */}
                                        {assignees.length > 0 && (
                                            <div className="flex -space-x-1.5">
                                                {assignees.slice(0, 3).map((a) => (
                                                    <div
                                                        key={a.user.id}
                                                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground ring-2 ring-card"
                                                        title={a.user.full_name || ""}
                                                    >
                                                        {(a.user.full_name || "?")
                                                            .split(" ")
                                                            .map((w) => w[0])
                                                            .join("")
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Edit/Delete buttons */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg text-muted-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditEntry(entry);
                                                }}
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteEntry(entry);
                                                }}
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
