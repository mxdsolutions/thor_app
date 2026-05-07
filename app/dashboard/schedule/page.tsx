"use client";

import { useState, useMemo, Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { useScheduleEntries, useStatusConfig } from "@/lib/swr";
import { useCreateDeepLink } from "@/lib/hooks/use-create-deep-link";
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
    toDateKey,
    fromDateKey,
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
    const [mobileSelectedDate, setMobileSelectedDate] = useState<string>(() => todayKey());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    useCreateDeepLink(() => { setEditingEntry(null); setModalOpen(true); });
    const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

    // Compute date range for data fetching based on view.
    // Union desktop range with the month surrounding `mobileSelectedDate` so the
    // mobile list view has data to render without a second fetch.
    const { rangeStart, rangeEnd } = useMemo(() => {
        let start: string;
        let end: string;
        if (view === "week") {
            const days = getWeekDays(currentWeekStart);
            start = days[0].dateKey;
            end = days[6].dateKey;
        } else {
            const days = getCalendarDays(currentMonth);
            start = days[0]?.dateKey || getMonthRange(currentMonth).start;
            end = days[days.length - 1]?.dateKey || getMonthRange(currentMonth).end;
        }
        const mobileDate = fromDateKey(mobileSelectedDate);
        const mobileMonthStart = toDateKey(new Date(mobileDate.getFullYear(), mobileDate.getMonth(), 1));
        const mobileMonthEnd = toDateKey(new Date(mobileDate.getFullYear(), mobileDate.getMonth() + 1, 0));
        if (mobileMonthStart < start) start = mobileMonthStart;
        if (mobileMonthEnd > end) end = mobileMonthEnd;
        return { rangeStart: start, rangeEnd: end };
    }, [view, currentMonth, currentWeekStart, mobileSelectedDate]);

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

    // Mobile day navigation
    const mobileEntries = useMemo(
        () => entriesByDate.get(mobileSelectedDate) || [],
        [entriesByDate, mobileSelectedDate],
    );
    const mobileDateLabel = useMemo(
        () => formatDayHeader(mobileSelectedDate),
        [mobileSelectedDate],
    );
    const goToPrevDayMobile = () => {
        const d = fromDateKey(mobileSelectedDate);
        d.setDate(d.getDate() - 1);
        setMobileSelectedDate(toDateKey(d));
    };
    const goToNextDayMobile = () => {
        const d = fromDateKey(mobileSelectedDate);
        d.setDate(d.getDate() + 1);
        setMobileSelectedDate(toDateKey(d));
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

    useMobileHeaderAction(useCallback(() => handleAddEntry(), []));

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
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Schedule</h1>
                        </div>
                        <DashboardControls>
                        {/* Desktop: Today + View toggle */}
                        <div className="hidden md:flex items-center gap-2">
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
                        {/* Desktop: Centred date pagination */}
                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2">
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
                        {/* Desktop: Schedule button */}
                        <Button className="hidden md:inline-flex px-6 shrink-0" onClick={() => handleAddEntry()}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Schedule Job
                        </Button>

                        {/* Mobile: Day pagination + native date picker + add */}
                        <div className="flex md:hidden items-center gap-2 w-full">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={goToPrevDayMobile}
                                aria-label="Previous day"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <div className="relative flex-1 flex items-center justify-center h-9 rounded-lg border border-border/50 px-3">
                                <span className="text-sm font-semibold truncate">
                                    {mobileDateLabel}
                                </span>
                                <input
                                    type="date"
                                    value={mobileSelectedDate}
                                    onChange={(e) => {
                                        if (e.target.value) setMobileSelectedDate(e.target.value);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    aria-label="Select date"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={goToNextDayMobile}
                                aria-label="Next day"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </DashboardControls>
                    </div>
                }
            >
                {/* Mobile: Day list only (no calendar grid) */}
                <div className="md:hidden px-4 py-4">
                    <DayDetailList
                        entries={mobileEntries}
                        dateLabel={mobileDateLabel}
                        statusConfig={jobStatusConfig}
                        onJobClick={handleJobClick}
                        onEditEntry={handleEditEntry}
                        onDeleteEntry={handleDeleteEntry}
                        loading={isLoading}
                    />
                </div>

                {/* Desktop: calendar + month detail list */}
                <div className={cn(
                    "hidden md:block md:px-6 lg:px-10",
                    view === "week" ? "md:flex md:flex-col md:h-full md:min-h-0" : "md:space-y-6 md:py-6",
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
