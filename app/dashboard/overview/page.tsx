"use client";

import { useState, useMemo } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { StatCard } from "@/components/dashboard/StatCard";
import { usePageTitle } from "@/lib/page-title-context";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
    priorityDotClass,
    getJobStatusDot,
} from "@/lib/design-system";
import { cn, formatCurrency } from "@/lib/utils";
import { Search as MagnifyingGlassIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useMyTasks, useJobs, useScheduleEntries, useOverviewMetrics } from "@/lib/swr";
import { MetricsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/features/shell/use-user-profile";
import { usePermissionOptional } from "@/lib/tenant-context";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

type Appointment = {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    job: {
        id: string;
        job_title: string;
        contact?: { id: string; first_name: string; last_name: string } | null;
        company?: { id: string; name: string } | null;
    } | null;
};

type ActiveJob = {
    id: string;
    job_title: string;
    description: string | null;
    amount: number;
    status: string;
    reference_id?: string | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    company?: { id: string; name: string } | null;
    assignees: Array<{ id: string; full_name: string | null; email: string | null }>;
};

type Task = {
    id: string;
    title: string;
    status: string;
    priority: number;
    due_date: string | null;
    job_id: string | null;
    assigned_user: { id: string; full_name: string } | null;
};

const priorityLabels: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Normal", 4: "Low" };

export default function OverviewPage() {
    usePageTitle("Overview");
    // Manager+ see the $ pipeline/AR/backlog cards; Members & Viewers don't.
    // The /api/overview/metrics endpoint enforces the same gate server-side,
    // so skipping the hook here also avoids a guaranteed-403 request.
    const canSeeFinancials = usePermissionOptional("dashboard.financials", "read", false);
    const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics(canSeeFinancials);
    const { data: tasksData, error: tasksError } = useMyTasks();
    const { data: jobsData, isLoading: jobsLoading } = useJobs();
    const { displayName } = useUserProfile();
    const firstName = (displayName || "").trim().split(/\s+/)[0] || null;
    const todayDateStr = useMemo(
        () => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
        []
    );
    const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
    const weekAheadIso = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split("T")[0];
    }, []);
    const { data: scheduleData, isLoading: scheduleLoading } = useScheduleEntries(todayIso, weekAheadIso);
    const tasksLoading = !tasksData && !tasksError;
    const [mobileTab, setMobileTab] = useState<"tasks" | "jobs" | "appointments">("tasks");
    const [jobsSearch, setJobsSearch] = useState("");
    const [taskDueFilter, setTaskDueFilter] = useState("All");
    const [appointmentDateFilter, setAppointmentDateFilter] = useState("week");

    const pluralize = (n: number, singular: string) => `${n.toLocaleString()} ${singular}${n === 1 ? "" : "s"}`;
    const activeJobs: ActiveJob[] = useMemo(() => {
        const items = (jobsData?.items || []) as Array<Record<string, unknown>>;
        return items
            .filter((j) => {
                const status = String(j.status || "").toLowerCase();
                return status === "active" || status === "new";
            })
            .map((j) => ({
                id: String(j.id),
                job_title: String(j.job_title || ""),
                description: (j.description as string | null) || null,
                amount: Number(j.amount || 0),
                status: String(j.status || ""),
                reference_id: (j.reference_id as string | null) || null,
                contact: (j.contact as { id: string; first_name: string; last_name: string } | null) || null,
                company: (j.company as { id: string; name: string } | null) || null,
                assignees: (j.assignees as Array<{ id: string; full_name: string | null; email: string | null }> | null) || [],
            }));
    }, [jobsData]);
    const myTasks: Task[] = useMemo(() => tasksData?.items || [], [tasksData]);
    const upcomingAppointments: Appointment[] = useMemo(() => {
        const items = (scheduleData?.items || []) as Appointment[];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return [...items]
            .filter((a) => {
                if (appointmentDateFilter === "week") return true;
                const dt = new Date(`${a.date}T${a.start_time || "00:00:00"}`);
                if (appointmentDateFilter === "today") return dt >= todayStart && dt <= todayEnd;
                if (appointmentDateFilter === "tomorrow") return dt >= tomorrowStart && dt <= tomorrowEnd;
                if (appointmentDateFilter === "week") return dt >= todayStart && dt <= weekEnd;
                return true;
            })
            .sort((a, b) => {
                const aKey = `${a.date}T${a.start_time || "00:00:00"}`;
                const bKey = `${b.date}T${b.start_time || "00:00:00"}`;
                return aKey.localeCompare(bKey);
            })
            .slice(0, 5);
    }, [scheduleData, appointmentDateFilter]);

    const pendingQuotes = metrics?.pendingQuotes ?? { count: 0, totalAmount: 0 };
    const pendingInvoices = metrics?.pendingInvoices ?? { count: 0, totalAmount: 0 };
    const activeJobsMetric = metrics?.activeJobs ?? { count: 0, totalAmount: 0 };

    const pendingQuotesCard = {
        label: "Pending Quotes",
        value: formatCurrency(pendingQuotes.totalAmount),
        sublabel: pluralize(pendingQuotes.count, "quote"),
        href: "/dashboard/quotes",
    };
    const pendingInvoicesCard = {
        label: "Pending Invoices",
        value: formatCurrency(pendingInvoices.totalAmount),
        sublabel: pluralize(pendingInvoices.count, "invoice"),
        href: "/dashboard/invoices",
    };
    const activeJobsCard = {
        label: "Active Jobs",
        value: formatCurrency(activeJobsMetric.totalAmount),
        sublabel: pluralize(activeJobsMetric.count, "job"),
        href: "/dashboard/jobs",
    };
    const statCards = [pendingQuotesCard, pendingInvoicesCard, activeJobsCard];

    const filteredJobs = useMemo(() => {
        const q = jobsSearch.trim().toLowerCase();
        if (!q) return activeJobs;
        return activeJobs.filter((job) =>
            job.job_title.toLowerCase().includes(q) ||
            (job.description || "").toLowerCase().includes(q) ||
            (job.reference_id || "").toLowerCase().includes(q) ||
            (job.contact ? `${job.contact.first_name} ${job.contact.last_name}`.toLowerCase().includes(q) : false) ||
            (job.company?.name || "").toLowerCase().includes(q)
        );
    }, [activeJobs, jobsSearch]);

    const filteredTasks = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const jobIds = jobsSearch.trim() ? new Set(filteredJobs.map((j) => j.id)) : null;

        return myTasks.filter((t) => {
            if (jobIds && (!t.job_id || !jobIds.has(t.job_id))) return false;
            if (taskDueFilter !== "All") {
                if (!t.due_date) return taskDueFilter === "none";
                const due = new Date(t.due_date);
                if (taskDueFilter === "overdue" && due >= todayStart) return false;
                if (taskDueFilter === "today" && (due < todayStart || due > todayEnd)) return false;
                if (taskDueFilter === "week" && (due < todayStart || due > weekEnd)) return false;
                if (taskDueFilter === "none") return false;
            }
            return true;
        });
    }, [myTasks, filteredJobs, jobsSearch, taskDueFilter]);

    const renderJobsTable = () => (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold tracking-tight leading-none shrink-0">Active Jobs</h2>
                <div className="relative w-full sm:flex-1 sm:max-w-xs">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs..."
                        className="pl-9 rounded-xl border-border/50"
                        value={jobsSearch}
                        onChange={(e) => setJobsSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 pr-4"}>Job Name</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Customer</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Assigned</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobsLoading ? (
                                <TableSkeleton rows={5} columns={4} />
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-sm text-muted-foreground">
                                        {jobsSearch ? "No jobs match your search." : "No new or active jobs."}
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <div className="flex flex-col min-w-0">
                                                <EntityPreviewCard entityType="job" entityId={job.id}>
                                                    <span className="font-semibold truncate max-w-[200px]">{job.job_title}</span>
                                                </EntityPreviewCard>
                                                <span className="text-[10px] text-muted-foreground truncate sm:hidden">
                                                    {job.contact ? `${job.contact.first_name} ${job.contact.last_name}` : (job.company?.name || "")}
                                                </span>
                                                {job.reference_id && (
                                                    <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">{job.reference_id}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[140px]"}>
                                            {job.contact ? (
                                                <EntityPreviewCard entityType="contact" entityId={job.contact.id}>
                                                    <span>{job.contact.first_name} {job.contact.last_name}</span>
                                                </EntityPreviewCard>
                                            ) : job.company ? (
                                                <EntityPreviewCard entityType="company" entityId={job.company.id}>
                                                    <span>{job.company.name}</span>
                                                </EntityPreviewCard>
                                            ) : "—"}
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[160px]"}>
                                            {job.assignees.length === 0
                                                ? "Unassigned"
                                                : (
                                                    <span className="inline-flex flex-wrap gap-x-1">
                                                        {job.assignees.map((a, i) => (
                                                            <span key={a.id}>
                                                                <EntityPreviewCard entityType="user" entityId={a.id}>
                                                                    <span>{a.full_name || a.email || "—"}</span>
                                                                </EntityPreviewCard>
                                                                {i < job.assignees.length - 1 && <span>, </span>}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", getJobStatusDot(job.status))} />
                                                <span className="text-xs font-medium text-muted-foreground capitalize">
                                                    {job.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderTasksTable = () => (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-xl font-semibold tracking-tight leading-none shrink-0">My Tasks</h2>
                <div className="flex items-center gap-2">
                    <Select value={taskDueFilter} onValueChange={setTaskDueFilter}>
                        <SelectTrigger className="w-full sm:w-[140px]">
                            <SelectValue placeholder="Due" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">Any date</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="today">Due today</SelectItem>
                            <SelectItem value="week">Next 7 days</SelectItem>
                            <SelectItem value="none">No due date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 pr-4"}>Task</th>
                                <th className={tableHeadCell + " px-4"}>Due</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksLoading ? (
                                <TableSkeleton rows={5} columns={3} />
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-12 text-sm text-muted-foreground">
                                        {jobsSearch ? "No tasks match the filtered jobs." : "No tasks assigned."}
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.slice(0, 10).map((task) => (
                                    <tr key={task.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getJobStatusDot(task.status))} />
                                                <span className="font-medium truncate max-w-[180px] block">{task.title}</span>
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4"}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", priorityDotClass[task.priority] || "bg-gray-400")} />
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {priorityLabels[task.priority] || "Normal"}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderActiveJobsCompact = () => (
        <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight leading-none">Active Jobs</h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {jobsLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : activeJobs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No active jobs.</div>
                ) : (
                    activeJobs.slice(0, 6).map((job) => {
                        const customerEntity = job.contact
                            ? { type: "contact" as const, id: job.contact.id, label: `${job.contact.first_name} ${job.contact.last_name}` }
                            : job.company
                                ? { type: "company" as const, id: job.company.id, label: job.company.name }
                                : null;
                        return (
                            <div key={job.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <EntityPreviewCard entityType="job" entityId={job.id}>
                                        <span className="font-medium text-sm truncate">{job.job_title}</span>
                                    </EntityPreviewCard>
                                    <span className="text-xs font-semibold tabular-nums shrink-0">${job.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getJobStatusDot(job.status))} />
                                    <span className="capitalize truncate">{job.status.replace(/_/g, " ")}</span>
                                    {customerEntity && (
                                        <>
                                            <span>·</span>
                                            <EntityPreviewCard entityType={customerEntity.type} entityId={customerEntity.id}>
                                                <span className="truncate">{customerEntity.label}</span>
                                            </EntityPreviewCard>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    const renderAppointments = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold tracking-tight leading-none shrink-0">Appointments</h2>
                <Select value={appointmentDateFilter} onValueChange={setAppointmentDateFilter}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="tomorrow">Tomorrow</SelectItem>
                        <SelectItem value="week">Next 7 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {scheduleLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : upcomingAppointments.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {appointmentDateFilter === "today"
                            ? "Nothing scheduled today."
                            : appointmentDateFilter === "tomorrow"
                                ? "Nothing scheduled tomorrow."
                                : "No appointments in the next 7 days."}
                    </div>
                ) : (
                    upcomingAppointments.map((a) => {
                        const dt = new Date(a.date + (a.start_time ? `T${a.start_time}` : "T00:00:00"));
                        const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(dt);
                        const timeLabel = a.start_time
                            ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(dt)
                            : "All day";
                        const customer = a.job?.contact
                            ? `${a.job.contact.first_name} ${a.job.contact.last_name}`
                            : a.job?.company?.name || null;
                        return (
                            <div key={a.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {dayLabel}
                                    </span>
                                    <span className="text-xs font-medium tabular-nums text-foreground">
                                        {timeLabel}
                                    </span>
                                </div>
                                <div className="font-medium text-sm truncate">
                                    {a.job ? (
                                        <EntityPreviewCard entityType="job" entityId={a.job.id}>
                                            <span>{a.job.job_title}</span>
                                        </EntityPreviewCard>
                                    ) : "Untitled"}
                                </div>
                                {customer && (
                                    <div className="text-xs text-muted-foreground truncate">
                                        {a.job?.contact ? (
                                            <EntityPreviewCard entityType="contact" entityId={a.job.contact.id}>
                                                <span>{customer}</span>
                                            </EntityPreviewCard>
                                        ) : a.job?.company ? (
                                            <EntityPreviewCard entityType="company" entityId={a.job.company.id}>
                                                <span>{customer}</span>
                                            </EntityPreviewCard>
                                        ) : <span>{customer}</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <DashboardPage className="space-y-6 lg:max-w-[85%] lg:mx-auto">
            {/* Welcome */}
            <div className="px-4 md:px-6 lg:px-10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {todayDateStr}
                </p>
                <h2 className="font-statement text-3xl font-extrabold tracking-tight">
                    Welcome back{firstName ? `, ${firstName}` : ""}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening across your workspace today.
                </p>
            </div>

            {/* Stat Cards — Manager+ only. Members/Viewers don't see $ totals. */}
            {canSeeFinancials && (
                metricsLoading ? (
                    <MetricsSkeleton count={3} />
                ) : (
                    <div>
                        {/* Mobile: horizontal scroll, all 3 cards */}
                        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1 md:hidden">
                            {statCards.map((card, i) => (
                                <div key={i} className="shrink-0 w-[75%] sm:w-[280px]">
                                    <StatCard label={card.label} value={card.value} sublabel={card.sublabel} href={card.href} />
                                </div>
                            ))}
                        </div>
                        {/* md+: 3-col grid */}
                        <div className="hidden md:grid md:grid-cols-3 gap-3 px-4 md:px-6 lg:px-10">
                            {statCards.map((card, i) => (
                                <StatCard key={i} label={card.label} value={card.value} sublabel={card.sublabel} href={card.href} />
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden px-4 md:px-6">
                <SegmentedControl
                    value={mobileTab}
                    onChange={setMobileTab}
                    options={[
                        { value: "tasks", label: "Tasks" },
                        { value: "appointments", label: "Appointments" },
                        { value: "jobs", label: "Jobs" },
                    ]}
                />
            </div>

            {/* Desktop: appointments left, stack of (tasks + active jobs) right */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr] gap-3 px-4 md:px-6 lg:px-10">
                {renderAppointments()}
                <div className="space-y-6">
                    {renderTasksTable()}
                    {renderActiveJobsCompact()}
                </div>
            </div>

            {/* Mobile: Tab content */}
            <div className="lg:hidden px-4 md:px-6">
                {mobileTab === "tasks"
                    ? renderTasksTable()
                    : mobileTab === "appointments"
                        ? renderAppointments()
                        : renderJobsTable()}
            </div>
        </DashboardPage>
    );
}
