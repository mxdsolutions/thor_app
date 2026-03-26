"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardPage, DashboardHeader, DashboardMetrics } from "@/components/dashboard/DashboardPage";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted
} from "@/lib/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CurrencyDollarIcon,
    BriefcaseIcon,
    WrenchScrewdriverIcon,
    UsersIcon,
    UserPlusIcon,
    ArrowUpRightIcon,
    FunnelIcon,
    RocketLaunchIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

type Stats = {
    totalUsers: number;
    newUsers: number;
    activeProjects: number;
    activeJobs: number;
    totalRevenue: number;
    openLeads: number;
    pipelineValue: number;
    totalCompanies: number;
    totalContacts: number;
};

type Transaction = {
    id: string;
    user: string;
    action: string;
    amount: string;
    status: string;
    date: string;
};

export default function DashboardOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stats");
            if (!res.ok) throw new Error("Failed to fetch statistics");
            const data = await res.json();
            setStats(data.stats);
            setTransactions(data.recentTransactions || []);
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
            label: "Active Projects",
            value: stats?.activeProjects.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: BriefcaseIcon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
        },
        {
            label: "Active Jobs",
            value: stats?.activeJobs.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: WrenchScrewdriverIcon,
            color: "text-rose-500",
            bg: "bg-rose-500/10"
        },
        {
            label: "Total Users",
            value: stats?.totalUsers.toLocaleString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: UsersIcon,
            color: "text-violet-500",
            bg: "bg-violet-500/10"
        },
        {
            label: "New Users (30d)",
            value: stats?.newUsers.toString() || "0",
            change: "+0%",
            trend: "up" as const,
            icon: UserPlusIcon,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            label: "Open Leads",
            value: stats?.openLeads.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: FunnelIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            label: "Pipeline Value",
            value: stats ? `$${stats.pipelineValue.toLocaleString()}` : "$0",
            change: "+0%",
            trend: "up" as const,
            icon: RocketLaunchIcon,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        },
    ];

    return (
        <DashboardPage className="space-y-6">
            <DashboardHeader
                title="Dashboard Overview"
                subtitle="Welcome back. Here's a snapshot of your platform's performance."
            />

            {/* Metrics Grid */}
            <motion.div variants={fadeInUp}>
                <DashboardMetrics metrics={metrics as any} />
            </motion.div>

            {/* Main Section - Chart Placeholder */}
            <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                <Card className="border-border shadow-none rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-6 border-b border-border/50 flex items-center justify-between">
                            <h2 className="text-sm font-bold tracking-tight">Monthly Performance</h2>
                            <Badge variant="secondary" className="rounded-full font-medium">Last 30 Days</Badge>
                        </div>
                        <div className="h-[300px] bg-secondary/20 flex flex-col items-center justify-center relative group overflow-hidden">
                            {/* Abstract Chart Representation */}
                            <div className="flex items-end gap-3 h-32 mb-4">
                                {[40, 70, 45, 90, 65, 80, 55, 75, 50, 85, 60, 95].map((h, i) => (
                                    <div
                                        key={i}
                                        style={{ height: `${h}%` }}
                                        className="w-3 bg-foreground/10 rounded-full transition-all group-hover:bg-foreground/20"
                                    />
                                ))}
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">Performance Metrics (Visual Placeholder)</p>
                            <p className="text-[11px] text-muted-foreground/60 mt-1">Real-time data synchronization is active</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Bottom Section - Recent Activity */}
            <motion.div variants={fadeInUp} className="space-y-4 pb-12">
                <div className="flex items-center justify-between px-4 md:px-6 lg:px-11">
                    <h2 className="text-sm font-bold tracking-tight">Recent Completed Jobs</h2>
                    <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        View All <ArrowUpRightIcon className="w-3 h-3" />
                    </button>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Member</th>
                                <th className={tableHeadCell + " px-4"}>Activity</th>
                                <th className={tableHeadCell + " px-4"}>Amount</th>
                                <th className={tableHeadCell + " px-4"}>Status</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10"}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">Loading recent activity...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No recent transactions found.</td>
                                </tr>
                            ) : (
                                transactions.map((activity) => (
                                    <tr key={activity.id} className={tableRow}>
                                        <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                            <span className="font-semibold text-sm">{activity.user}</span>
                                        </td>
                                        <td className={tableCellMuted + " px-4"}>
                                            {activity.action}
                                        </td>
                                        <td className={tableCell + " px-4"}>
                                            <span className={`font-bold ${activity.amount.startsWith('-') ? 'text-rose-500' : 'text-foreground'}`}>
                                                {activity.amount}
                                            </span>
                                        </td>
                                        <td className={tableCell + " px-4"}>
                                            <Badge variant="outline" className="rounded-full text-[10px] font-medium border-border/50">
                                                {activity.status}
                                            </Badge>
                                        </td>
                                        <td className={tableCellMuted + " pl-4 pr-4 md:pr-6 lg:pr-10"}>
                                            {activity.date}
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
