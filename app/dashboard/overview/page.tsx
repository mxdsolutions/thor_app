"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
import { IconSearch as MagnifyingGlassIcon } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { fadeInUp } from "@/lib/motion";
import { useStats, useMyTasks, useJobs } from "@/lib/swr";
import { MetricsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

type ActiveJob = {
    id: string;
    job_title: string;
    description: string | null;
    amount: number;
    status: string;
    reference_id?: string | null;
    service?: { id: string; name: string } | null;
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

type RevenueDataPoint = {
    month: string;
    revenue: number;
    jobs: number;
};

const priorityLabels: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Normal", 4: "Low" };

export default function OverviewPage() {
    usePageTitle("Overview");
    const { data: statsData, isLoading: statsLoading } = useStats();
    const { data: tasksData, error: tasksError } = useMyTasks();
    const { data: jobsData, isLoading: jobsLoading } = useJobs();
    const tasksLoading = !tasksData && !tasksError;
    const [mobileTab, setMobileTab] = useState<"tasks" | "jobs">("tasks");
    const [jobsSearch, setJobsSearch] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState("All");
    const [taskDueFilter, setTaskDueFilter] = useState("All");

    const stats = statsData?.stats || null;
    const activeJobs: ActiveJob[] = useMemo(() => {
        const items = (jobsData?.items || []) as Array<Record<string, unknown>>;
        return items
            .filter((j) => {
                const status = String(j.status || "").toLowerCase();
                return status !== "completed" && status !== "cancelled";
            })
            .map((j) => ({
                id: String(j.id),
                job_title: String(j.job_title || ""),
                description: (j.description as string | null) || null,
                amount: Number(j.amount || 0),
                status: String(j.status || ""),
                reference_id: (j.reference_id as string | null) || null,
                service: (j.service as { id: string; name: string } | null) || null,
                contact: (j.contact as { id: string; first_name: string; last_name: string } | null) || null,
                company: (j.company as { id: string; name: string } | null) || null,
                assignees: (j.assignees as Array<{ id: string; full_name: string | null; email: string | null }> | null) || [],
            }));
    }, [jobsData]);
    const myTasks: Task[] = useMemo(() => tasksData?.items || [], [tasksData]);
    const revenueChart: RevenueDataPoint[] = stats?.revenueChart || [];

    // Calculate this month's revenue from chart data
    const thisMonthRevenue = revenueChart.length > 0
        ? revenueChart[revenueChart.length - 1].revenue
        : 0;

    const statCards = [
        { label: "Revenue This Month", value: formatCurrency(thisMonthRevenue), href: null },
        { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue || 0), href: null },
        { label: "Total Jobs", value: stats?.totalJobs?.toLocaleString() || "0", href: "/dashboard/jobs" },
    ];

    const filteredJobs = useMemo(() => {
        const q = jobsSearch.trim().toLowerCase();
        if (!q) return activeJobs;
        return activeJobs.filter((job) =>
            job.job_title.toLowerCase().includes(q) ||
            (job.description || "").toLowerCase().includes(q) ||
            (job.reference_id || "").toLowerCase().includes(q) ||
            (job.service?.name || "").toLowerCase().includes(q) ||
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
            if (taskStatusFilter !== "All" && t.status !== taskStatusFilter) return false;
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
    }, [myTasks, filteredJobs, jobsSearch, taskStatusFilter, taskDueFilter]);

    const jobsTable = (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold uppercase tracking-wide leading-none shrink-0">All Jobs</h2>
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs..."
                        className="pl-9 h-9 rounded-xl border-border/50 text-sm"
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
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Type</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Customer</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Assigned</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobsLoading ? (
                                <TableSkeleton rows={5} columns={5} />
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                                        {jobsSearch ? "No jobs match your search." : "No active jobs."}
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold truncate max-w-[200px]">{job.job_title}</span>
                                                {job.reference_id && (
                                                    <span className="text-[10px] text-muted-foreground font-mono">{job.reference_id}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[140px]"}>
                                            {job.service?.name || "—"}
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[140px]"}>
                                            {job.contact ? `${job.contact.first_name} ${job.contact.last_name}` : (job.company?.name || "—")}
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[160px]"}>
                                            {job.assignees.length === 0
                                                ? "Unassigned"
                                                : job.assignees.map(a => a.full_name || a.email || "—").join(", ")}
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

    const tasksTable = (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl font-bold uppercase tracking-wide leading-none shrink-0">My Tasks</h2>
                <div className="flex items-center gap-2">
                    <Select value={taskDueFilter} onValueChange={setTaskDueFilter}>
                        <SelectTrigger className="w-[120px] h-9 text-xs">
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
                    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                        <SelectTrigger className="w-[120px] h-9 text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
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

    return (
        <DashboardPage className="space-y-6">
            {/* Stat Cards */}
            {statsLoading ? (
                <MetricsSkeleton count={3} />
            ) : (
                <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                    <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
                        {statCards.map((card, i) => (
                            <StatCard key={i} label={card.label} value={card.value} href={card.href} />
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden px-4 md:px-6">
                <SegmentedControl
                    value={mobileTab}
                    onChange={setMobileTab}
                    options={[
                        { value: "tasks", label: "My Tasks" },
                        { value: "jobs", label: "All Jobs" },
                    ]}
                />
            </div>

            {/* Desktop: 65:35 split */}
            <motion.div variants={fadeInUp} className="hidden lg:grid grid-cols-[65fr_35fr] gap-3 px-4 md:px-6 lg:px-10">
                {jobsTable}
                {tasksTable}
            </motion.div>

            {/* Mobile: Tab content */}
            <motion.div variants={fadeInUp} className="lg:hidden px-4 md:px-6">
                {mobileTab === "tasks" ? tasksTable : jobsTable}
            </motion.div>
        </DashboardPage>
    );
}
