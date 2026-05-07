"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useAnalytics, type AnalyticsPeriod } from "@/lib/swr";
import { ChartSkeleton, MetricsSkeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { PeriodSelector } from "@/components/dashboard/analytics/PeriodSelector";
import { KpiTilesRow } from "@/components/dashboard/analytics/KpiTilesRow";
import { RevenueTrendChart } from "@/components/dashboard/analytics/RevenueTrendChart";
import { JobProfitabilityTable } from "@/components/dashboard/analytics/JobProfitabilityTable";
import { ARAgingChart } from "@/components/dashboard/analytics/ARAgingChart";

export default function AnalyticsPage() {
    usePageTitle("Analytics");
    const [period, setPeriod] = useState<AnalyticsPeriod>("90d");
    const { data, isLoading } = useAnalytics(period);

    return (
        <DashboardPage className="space-y-6">
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 lg:px-10">
                <h1 className="font-statement text-2xl font-extrabold tracking-tight">Analytics</h1>
                <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            {isLoading || !data ? (
                <>
                    <MetricsSkeleton count={5} />
                    <div className="px-4 md:px-6 lg:px-10 space-y-3">
                        <ChartSkeleton />
                        <ChartSkeleton />
                        <ChartSkeleton />
                    </div>
                </>
            ) : (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    <motion.div variants={fadeInUp}>
                        <KpiTilesRow data={data} />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                        <RevenueTrendChart data={data.revenueChart} granularity={data.period.granularity} />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                        <JobProfitabilityTable rows={data.jobProfitability} />
                    </motion.div>

                    <motion.div variants={fadeInUp} className="px-4 md:px-6 lg:px-10">
                        <ARAgingChart data={data.arAging} />
                    </motion.div>
                </motion.div>
            )}
        </DashboardPage>
    );
}
