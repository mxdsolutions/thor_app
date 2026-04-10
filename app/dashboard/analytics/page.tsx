"use client";

import { motion } from "framer-motion";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { formatCurrency } from "@/lib/utils";
import { useStats } from "@/lib/swr";
import { MetricsSkeleton } from "@/components/ui/skeleton";
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

type RevenueDataPoint = {
    month: string;
    revenue: number;
    jobs: number;
};

export default function AnalyticsPage() {
    usePageTitle("Analytics");
    const { data: statsData, isLoading: statsLoading } = useStats();
    const revenueChart: RevenueDataPoint[] = statsData?.stats?.revenueChart || [];

    return (
        <DashboardPage className="space-y-6">
            {statsLoading ? (
                <MetricsSkeleton count={1} />
            ) : revenueChart.length > 0 ? (
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
            ) : (
                <div className="px-4 md:px-6 lg:px-10">
                    <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                        No revenue data to display yet.
                    </div>
                </div>
            )}
        </DashboardPage>
    );
}
