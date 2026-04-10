"use client";

import { DashboardPage, DashboardMetrics, type DashboardMetric } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { usePlatformStats } from "@/lib/swr";
import { IconBuildingSkyscraper as BuildingOffice2Icon, IconUsersGroup as UserGroupIcon, IconClock as ClockIcon, IconAlertTriangle as ExclamationTriangleIcon, IconSparkles as SparklesIcon, IconCircleX as XCircleIcon } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformDashboardPage() {
    usePageTitle("Platform Dashboard");
    const { data, isLoading } = usePlatformStats();

    if (isLoading) {
        return (
            <DashboardPage>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-4 md:px-6 lg:px-10">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
            </DashboardPage>
        );
    }

    const stats = data || {};

    const metrics: DashboardMetric[] = [
        {
            label: "Total Tenants",
            value: stats.total_tenants,
            icon: BuildingOffice2Icon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Active Tenants",
            value: stats.active_tenants,
            icon: SparklesIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Trial Tenants",
            value: stats.trial_tenants,
            icon: ClockIcon,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
        {
            label: "Suspended",
            value: stats.suspended_tenants,
            icon: XCircleIcon,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
        },
        {
            label: "Total Users",
            value: stats.total_users,
            icon: UserGroupIcon,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
        },
        {
            label: "Expiring Trials",
            value: stats.expiring_trials,
            change: stats.expiring_trials > 0 ? "Action needed" : undefined,
            trend: stats.expiring_trials > 0 ? "down" : undefined,
            changeLabel: "next 7 days",
            icon: ExclamationTriangleIcon,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
    ];

    return (
        <DashboardPage>
            <DashboardMetrics metrics={metrics} />
        </DashboardPage>
    );
}
