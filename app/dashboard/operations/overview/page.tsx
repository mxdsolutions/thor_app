"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DashboardPage, DashboardHeader, DashboardMetrics } from "@/components/dashboard/DashboardPage";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted
} from "@/lib/design-system";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    CurrencyDollarIcon,
    BriefcaseIcon,
    ClipboardDocumentListIcon,
    ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

type Stats = {
    totalProjects: number;
    totalJobs: number;
    totalRevenue: number;
    activeProjects: number;
    activeJobs: number;
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

export default function DashboardOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stats");
            if (!res.ok) throw new Error("Failed to fetch statistics");
            const data = await res.json();
            setStats(data.stats);
            setActiveJobs(data.activeJobs || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load dashboard statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const metrics = [
        {
            label: "Total Revenue",
            value: stats ? `$${stats.totalRevenue.toLocaleString()}` : "$0",
            change: "+0%",
            trend: "up" as const,
            icon: CurrencyDollarIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            label: "Total Jobs",
            value: stats?.totalJobs.toLocaleString() || "0",
            change: `${stats?.activeJobs || 0} active`,
            trend: "neutral" as const,
            icon: BriefcaseIcon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
        },
        {
            label: "Total Projects",
            value: stats?.totalProjects.toLocaleString() || "0",
            change: `${stats?.activeProjects || 0} active`,
            trend: "neutral" as const,
            icon: ClipboardDocumentListIcon,
            color: "text-violet-500",
            bg: "bg-violet-500/10"
        },
    ];

    return (
        <DashboardPage className="space-y-6">
            <DashboardHeader
                title="Operations Overview"
                subtitle="Jobs, projects, and revenue at a glance."
            />

            {/* Metrics Grid */}
            <motion.div variants={fadeInUp}>
                <DashboardMetrics metrics={metrics as any} />
            </motion.div>

            {/* Active Jobs Mini Table */}
            <motion.div variants={fadeInUp} className="space-y-4 pb-12">
                <div className="flex items-center justify-between px-4 md:px-6 lg:px-11">
                    <h2 className="text-sm font-bold tracking-tight">Active Jobs</h2>
                    <Link href="/dashboard/operations/jobs" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        View All <ArrowUpRightIcon className="w-3 h-3" />
                    </Link>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Job</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Project</th>
                                <th className={tableHeadCell + " px-4"}>Assigned To</th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Value</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 hidden sm:table-cell"}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading active jobs...</td>
                                </tr>
                            ) : activeJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No active jobs.</td>
                                </tr>
                            ) : (
                                activeJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group"}>
                                        <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                            <span className="font-semibold text-sm truncate max-w-[200px] block">{job.description}</span>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                            {job.project || "—"}
                                        </td>
                                        <td className={tableCell + " px-4"}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-border/50">
                                                    {job.assignedTo?.charAt(0) || "?"}
                                                </div>
                                                <span className="text-sm truncate">{job.assignedTo || "Unassigned"}</span>
                                            </div>
                                        </td>
                                        <td className={tableCell + " px-4 text-right sm:text-left"}>
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
                                        <td className={tableCellMuted + " pl-4 pr-4 md:pr-6 lg:pr-10 hidden sm:table-cell"}>
                                            {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </DashboardPage>
    );
}
