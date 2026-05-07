"use client";

import type { ReactNode } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { cardGap } from "@/lib/design-system";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsResponse, AnalyticsPeriod } from "@/lib/swr";

interface KpiTilesRowProps {
    data: AnalyticsResponse;
}

type Tone = "up" | "down" | "flat";

function deltaText(current: number, previous: number): { text: string; tone: Tone } {
    if (previous === 0) {
        if (current === 0) return { text: "no prior data", tone: "flat" };
        return { text: "new this period", tone: "up" };
    }
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    if (Math.abs(pct) < 0.1) return { text: "0% vs prev period", tone: "flat" };
    const arrow = pct > 0 ? "↑" : "↓";
    return {
        text: `${arrow} ${Math.abs(pct).toFixed(1)}% vs prev period`,
        tone: pct > 0 ? "up" : "down",
    };
}

function toneClass(tone: Tone): string {
    if (tone === "up") return "text-emerald-600";
    if (tone === "down") return "text-rose-600";
    return "text-muted-foreground";
}

function showDeltas(period: AnalyticsPeriod): boolean {
    return period !== "all";
}

function deltaSublabel(current: number, previous: number, invert = false): ReactNode {
    const d = deltaText(current, previous);
    const tone: Tone = invert
        ? d.tone === "up" ? "down" : d.tone === "down" ? "up" : "flat"
        : d.tone;
    return <span className={toneClass(tone)}>{d.text}</span>;
}

export function KpiTilesRow({ data }: KpiTilesRowProps) {
    const { kpis, requestedPeriod } = data;
    const includeDeltas = showDeltas(requestedPeriod);

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 ${cardGap} px-4 md:px-6 lg:px-10`}>
            <StatCard
                label="Total Revenue"
                value={formatCurrency(kpis.totalRevenue.current)}
                sublabel={includeDeltas ? deltaSublabel(kpis.totalRevenue.current, kpis.totalRevenue.previous) : undefined}
            />
            <StatCard
                label="Cash Collected"
                value={formatCurrency(kpis.cashCollected.current)}
                sublabel={includeDeltas ? deltaSublabel(kpis.cashCollected.current, kpis.cashCollected.previous) : undefined}
            />
            <StatCard
                label="Outstanding AR"
                value={formatCurrency(kpis.outstandingAR.current)}
                sublabel={<span className="text-muted-foreground">current snapshot</span>}
            />
            <StatCard
                label="Total Expenses"
                value={formatCurrency(kpis.totalExpenses.current)}
                sublabel={includeDeltas ? deltaSublabel(kpis.totalExpenses.current, kpis.totalExpenses.previous, true) : undefined}
            />
            <StatCard
                label="Active Jobs"
                value={String(kpis.activeJobs.current)}
            />
        </div>
    );
}
