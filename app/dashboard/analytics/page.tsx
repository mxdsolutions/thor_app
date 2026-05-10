"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useAnalytics, type AnalyticsPeriod } from "@/lib/swr";
import { ChartSkeleton, MetricsSkeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/dashboard/analytics/PeriodSelector";
import { KpiTilesRow } from "@/components/dashboard/analytics/KpiTilesRow";
import { JobProfitabilityTable } from "@/components/dashboard/analytics/JobProfitabilityTable";

// Charts pull in recharts (~200KB). Load only when this page actually renders
// them so the rest of the dashboard bundle stays lean.
const RevenueTrendChart = dynamic(
    () => import("@/components/dashboard/analytics/RevenueTrendChart").then((m) => m.RevenueTrendChart),
    { ssr: false, loading: () => <ChartSkeleton /> },
);
const ARAgingChart = dynamic(
    () => import("@/components/dashboard/analytics/ARAgingChart").then((m) => m.ARAgingChart),
    { ssr: false, loading: () => <ChartSkeleton /> },
);

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
                <div className="space-y-6">
                    <KpiTilesRow data={data} />

                    <div className="px-4 md:px-6 lg:px-10">
                        <RevenueTrendChart data={data.revenueChart} granularity={data.period.granularity} />
                    </div>

                    <div className="px-4 md:px-6 lg:px-10">
                        <JobProfitabilityTable rows={data.jobProfitability} />
                    </div>

                    <div className="px-4 md:px-6 lg:px-10">
                        <ARAgingChart data={data.arAging} />
                    </div>
                </div>
            )}
        </DashboardPage>
    );
}
