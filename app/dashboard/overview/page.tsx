"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { cn, formatCurrency } from "@/lib/utils";
import { IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { statLabelClass, statValueClass } from "@/lib/design-system";
import { useStats, useMyTasks } from "@/lib/swr";
import { MetricsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

type ActiveJob = {
    id: string;
    description: string;
    project: string | null;
    assignedTo: string | null;
    amount: number;
    status: string;
    scheduledDate: string | null;
};

type Task = {
    id: string;
    title: string;
    status: string;
    priority: number;
    due_date: string | null;
    assigned_user: { id: string; full_name: string } | null;
};

type RevenueDataPoint = {
    month: string;
    revenue: number;
    jobs: number;
};

const priorityLabels: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Normal", 4: "Low" };
const priorityColors: Record<number, string> = { 1: "bg-red-500", 2: "bg-orange-500", 3: "bg-blue-500", 4: "bg-gray-400" };

export default function OverviewPage() {
    usePageTitle("Overview");
    const { data: statsData, isLoading: statsLoading } = useStats();
    const { data: tasksData, error: tasksError } = useMyTasks();
    const tasksLoading = !tasksData && !tasksError;
    const [mobileTab, setMobileTab] = useState<"tasks" | "jobs">("tasks");

    const stats = statsData?.stats || null;
    const activeJobs: ActiveJob[] = statsData?.activeJobs || [];
    const myTasks: Task[] = tasksData?.items || [];
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

    const jobsTable = (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight">All Jobs</h2>
                <Link href="/dashboard/jobs" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    View All <ArrowUpRightIcon className="w-3 h-3" />
                </Link>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 pr-4"}>Job</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Scope</th>
                                <th className={tableHeadCell + " px-4 text-right"}>Value</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statsLoading ? (
                                <TableSkeleton rows={5} columns={4} />
                            ) : activeJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-sm text-muted-foreground">No active jobs.</td>
                                </tr>
                            ) : (
                                activeJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <span className="font-semibold text-sm truncate max-w-[200px] block">{job.description}</span>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[120px]"}>
                                            {job.project || "—"}
                                        </td>
                                        <td className={tableCell + " px-4 text-right"}>
                                            <span className="font-bold text-sm">${job.amount.toLocaleString()}</span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    job.status === "completed" ? "bg-emerald-500" :
                                                    job.status === "in_progress" ? "bg-blue-500" :
                                                    job.status === "cancelled" ? "bg-red-500" : "bg-amber-500"
                                                )} />
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
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight">My Tasks</h2>
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
                            ) : myTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-12 text-sm text-muted-foreground">No tasks assigned.</td>
                                </tr>
                            ) : (
                                myTasks.slice(0, 10).map((task) => (
                                    <tr key={task.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    task.status === "completed" ? "bg-emerald-500" :
                                                    task.status === "in_progress" ? "bg-blue-500" :
                                                    task.status === "cancelled" ? "bg-red-500" : "bg-amber-500"
                                                )} />
                                                <span className="font-medium text-sm truncate max-w-[180px] block">{task.title}</span>
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4"}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", priorityColors[task.priority] || "bg-gray-400")} />
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
                        {statCards.map((card, i) => {
                            const inner = (
                                <Card key={i} className={cn("border-border shadow-none rounded-2xl shrink-0 min-w-[140px] flex-1", card.href && "hover:bg-secondary/40 transition-colors cursor-pointer")}>
                                    <CardContent className="p-4 md:p-5">
                                        <span className={statLabelClass}>{card.label}</span>
                                        <h3 className={cn(statValueClass, "mt-2")}>{card.value}</h3>
                                    </CardContent>
                                </Card>
                            );
                            return card.href ? <Link key={i} href={card.href} className="shrink-0 min-w-[140px] flex-1">{inner}</Link> : <div key={i} className="shrink-0 min-w-[140px] flex-1">{inner}</div>;
                        })}
                    </div>
                </motion.div>
            )}

            {/* Revenue Chart */}
            {!statsLoading && revenueChart.length > 0 && (
                <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold tracking-tight">Revenue</h2>
                            <span className="text-xs text-muted-foreground">Last 6 months</span>
                        </div>
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueChart} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                                        contentStyle={{
                                            backgroundColor: "var(--card)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "12px",
                                            fontSize: "13px",
                                        }}
                                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="var(--foreground)"
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden px-4 md:px-6">
                <div className="flex gap-1 p-1 bg-secondary/60 rounded-xl w-fit">
                    <button
                        onClick={() => setMobileTab("tasks")}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                            mobileTab === "tasks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        My Tasks
                    </button>
                    <button
                        onClick={() => setMobileTab("jobs")}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                            mobileTab === "jobs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        All Jobs
                    </button>
                </div>
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
