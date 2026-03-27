"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardPage, DashboardHeader, DashboardMetrics } from "@/components/dashboard/DashboardPage";
import {
    FunnelIcon,
    RocketLaunchIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

type Stats = {
    openLeads: number;
    pipelineValue: number;
    totalCompanies: number;
    totalContacts: number;
    totalRevenue: number;
};

export default function CrmOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stats");
            if (!res.ok) throw new Error("Failed to fetch statistics");
            const data = await res.json();
            setStats(data.stats);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load CRM statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const metrics = [
        {
            label: "Open Leads",
            value: stats?.openLeads.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: FunnelIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Pipeline Value",
            value: stats ? `$${stats.pipelineValue.toLocaleString()}` : "$0",
            change: "+0%",
            trend: "up" as const,
            icon: RocketLaunchIcon,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
        {
            label: "Total Revenue",
            value: stats ? `$${stats.totalRevenue.toLocaleString()}` : "$0",
            change: "+0%",
            trend: "up" as const,
            icon: CurrencyDollarIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Companies",
            value: stats?.totalCompanies.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: BuildingOffice2Icon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
        },
        {
            label: "Contacts",
            value: stats?.totalContacts.toString() || "0",
            change: "+0",
            trend: "up" as const,
            icon: UserGroupIcon,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
        },
    ];

    return (
        <DashboardPage className="space-y-6">
            <DashboardHeader
                title="CRM Overview"
                subtitle="Your sales pipeline and customer relationships at a glance."
            />

            <motion.div variants={fadeInUp}>
                <DashboardMetrics metrics={metrics as any} />
            </motion.div>
        </DashboardPage>
    );
}
