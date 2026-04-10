"use client";

import { useState, useMemo, Suspense } from "react";
import { cn } from "@/lib/utils";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { usePageTitle } from "@/lib/page-title-context";
import { useScheduleEntries, useStatusConfig } from "@/lib/swr";
import { DEFAULT_JOB_STATUSES, toStatusConfig } from "@/lib/status-config";
import { CalendarGrid } from "@/components/schedule/CalendarGrid";
import type { CalendarView } from "@/components/schedule/CalendarGrid";
import { DayDetailList } from "@/components/schedule/DayDetailList";
import { ScheduleEntryModal } from "@/components/modals/ScheduleEntryModal";
import { JobSideSheet } from "@/components/sheets/JobSideSheet";
import { Button } from "@/components/ui/button";
import { IconChevronLeft as ChevronLeftIcon, IconChevronRight as ChevronRightIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import {
    formatMonthYear,
    formatDayHeader,
    formatWeekRange,
    getMonthRange,
    getWeekDateKeys,
    getWeekStart,
    getWeekDays,
    getCalendarDays,
    todayKey,
} from "@/lib/calendar-utils";
import type { ScheduleEntry } from "@/components/schedule/types";
import { toast } from "sonner";

export default function SchedulePage() {
    return (
        <Suspense>
            <SchedulePageContent />
        </Suspense>
    );
}

function SchedulePageContent() {
    usePageTitle("Schedule");

    const [view, setView] = useState<CalendarView>("week");
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

    // Compute date range for data fetching based on view
    const { rangeStart, rangeEnd } = useMemo(() => {
        if (view === "week") {
            const days = getWeekDays(currentWeekStart);
            return { rangeStart: days[0].dateKey, rangeEnd: days[6].dateKey };
        }
        const days = getCalendarDays(currentMonth);
        return {
            rangeStart: days[0]?.dateKey || getMonthRange(currentMonth).start,
            rangeEnd: days[days.length - 1]?.dateKey || getMonthRange(currentMonth).end,
        };
    }, [view, currentMonth, currentWeekStart]);

    const { data, isLoading, mutate } = useScheduleEntries(rangeStart, rangeEnd);
    const entries: ScheduleEntry[] = useMemo(() => data?.items || [], [data]);

    const { data: statusData } = useStatusConfig("job");
    const jobStatusConfig = toStatusConfig(statusData?.statuses ?? DEFAULT_JOB_STATUSES);

    // Group entries by date
    const entriesByDate = useMemo(() => {
        const map = new Map<string, ScheduleEntry[]>();
        for (const entry of entries) {
            const key = entry.date;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(entry);
        }
        return map;
    }, [entries]);

    // Detail list data
    const detailEntries = useMemo(() => {
        if (selectedDate) {
            return entriesByDate.get(selectedDate) || [];
        }
        if (view === "week") {
            return entries;
        }
        const weekKeys = new Set(getWeekDateKeys(new Date()));
        return entries.filter((e) => weekKeys.has(e.date));
    }, [selectedDate, entriesByDate, entries, view]);

    const detailLabel = useMemo(() => {
        if (selectedDate) return formatDayHeader(selectedDate);
        if (view === "week") return `Week of ${formatWeekRange(currentWeekStart)}`;
        const weekKeys = getWeekDateKeys(new Date());
        const start = new Date(weekKeys[0] + "T00:00:00");
        const end = new Date(weekKeys[6] + "T00:00:00");
        return `This Week (${start.getDate()} ${start.toLocaleDateString("en-AU", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("en-AU", { month: "short", year: "numeric" })})`;
    }, [selectedDate, view, currentWeekStart]);

    // Navigation title
    const navTitle = view === "month"
        ? formatMonthYear(currentMonth)
        : formatWeekRange(currentWeekStart);

    // Navigation
    const goToPrev = () => {
        setSelectedDate(null);
        if (view === "month") {
            setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        } else {
            setCurrentWeekStart((prev) => {
                const d = new Date(prev);
                d.setDate(d.getDate() - 7);
                return d;
            });
        }
    };
    const goToNext = () => {
        setSelectedDate(null);
        if (view === "month") {
            setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        } else {
            setCurrentWeekStart((prev) => {
                const d = new Date(prev);
                d.setDate(d.getDate() + 7);
                return d;
            });
        }
    };
    const goToToday = () => {
        setCurrentMonth(new Date());
        setCurrentWeekStart(getWeekStart(new Date()));
        setSelectedDate(todayKey());
    };

    const switchView = (newView: CalendarView) => {
        setView(newView);
        setSelectedDate(null);
        if (newView === "week") {
            setCurrentWeekStart(getWeekStart(currentMonth));
        } else {
            setCurrentMonth(new Date(currentWeekStart));
        }
    };

    // Handlers
    const handleJobClick = (entry: ScheduleEntry) => {
        if (entry.job) {
            // Unwrap nested assignees: job.assignees is Array<{ user: Profile }> from the PostgREST join.
            const rawAssignees = (entry.job.assignees || []) as Array<{ user: unknown }>;
            const unwrapped = {
                ...entry.job,
                assignees: rawAssignees.map((a) => a.user).filter(Boolean),
            };
            setSelectedJob(unwrapped);
            setSheetOpen(true);
        }
    };

    const handleAddEntry = (dateKey?: string) => {
        setEditingEntry(null);
        if (dateKey) setSelectedDate(dateKey);
        setModalOpen(true);
    };

    const handleEditEntry = (entry: ScheduleEntry) => {
        setEditingEntry(entry);
        setModalOpen(true);
    };

    const handleDeleteEntry = async (entry: ScheduleEntry) => {
        try {
            const res = await fetch(`/api/schedule?id=${entry.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Schedule entry removed");
            mutate();
        } catch {
            toast.error("Failed to delete entry");
        }
    };

    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        {/* Left: Today + View toggle */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                className="px-4"
                                onClick={goToToday}
                            >
                                Today
                            </Button>
                            <div className="flex items-center rounded-lg border border-border/50 p-1">
                                <button
                                    type="button"
                                    onClick={() => switchView("week")}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                                        view === "week"
                                            ? "bg-foreground text-background"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchView("month")}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                                        view === "month"
                                            ? "bg-foreground text-background"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    Month
                                </button>
                            </div>
                        </div>
                        {/* Centre: Date pagination */}
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={goToPrev}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <h2 className="text-sm font-semibold min-w-[170px] text-center">
                                {navTitle}
                            </h2>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={goToNext}
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                        {/* Right: Schedule button */}
                        <Button className="px-6 shrink-0" onClick={() => handleAddEntry()}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Schedule Job
                        </Button>
                    </DashboardControls>
                }
            >
                <div className={cn(
                    "px-4 md:px-6 lg:px-10",
                    view === "week" ? "flex flex-col h-full min-h-0" : "space-y-6 py-6",
                )}>
                    <CalendarGrid
                        view={view}
                        currentMonth={currentMonth}
                        weekStart={currentWeekStart}
                        selectedDate={selectedDate}
                        entriesByDate={entriesByDate}
                        statusConfig={jobStatusConfig}
                        onSelectDate={setSelectedDate}
                        onJobClick={handleJobClick}
                        onDateClick={(dateKey) => handleAddEntry(dateKey)}
                    />
                    {view === "week" && <div className="shrink-0 h-6" />}
                    {view === "month" && (
                        <DayDetailList
                            entries={detailEntries}
                            dateLabel={detailLabel}
                            statusConfig={jobStatusConfig}
                            onJobClick={handleJobClick}
                            onEditEntry={handleEditEntry}
                            onDeleteEntry={handleDeleteEntry}
                            loading={isLoading}
                        />
                    )}
                </div>
            </ScrollableTableLayout>

            <ScheduleEntryModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSaved={() => mutate()}
                entry={editingEntry}
                defaultDate={selectedDate || todayKey()}
            />

            <JobSideSheet
                job={selectedJob}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onUpdate={() => mutate()}
            />
        </>
    );
}
