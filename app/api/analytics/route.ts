import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { requirePermission } from "@/app/api/_lib/permissions";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { analyticsQuerySchema, type AnalyticsPeriod } from "@/lib/validation";

type DateRange = { start: string; end: string };

function isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
    const out = new Date(d);
    out.setDate(out.getDate() + days);
    return out;
}

/** Resolve a period name to current and previous date ranges plus chart granularity.
 *  "all" uses a fixed past anchor so the chart still renders; previous-range deltas
 *  collapse to zero in that mode (no meaningful comparison exists). */
function resolvePeriod(period: AnalyticsPeriod): {
    current: DateRange;
    previous: DateRange;
    granularity: "week" | "month";
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = isoDate(today);

    switch (period) {
        case "30d": {
            const start = addDays(today, -29);
            const prevEnd = addDays(start, -1);
            const prevStart = addDays(prevEnd, -29);
            return {
                current: { start: isoDate(start), end: todayIso },
                previous: { start: isoDate(prevStart), end: isoDate(prevEnd) },
                granularity: "week",
            };
        }
        case "90d": {
            const start = addDays(today, -89);
            const prevEnd = addDays(start, -1);
            const prevStart = addDays(prevEnd, -89);
            return {
                current: { start: isoDate(start), end: todayIso },
                previous: { start: isoDate(prevStart), end: isoDate(prevEnd) },
                granularity: "month",
            };
        }
        case "qtd": {
            const month = today.getMonth();
            const qStart = new Date(today.getFullYear(), Math.floor(month / 3) * 3, 1);
            const lengthDays = Math.round((today.getTime() - qStart.getTime()) / 86400000);
            const prevQEnd = addDays(qStart, -1);
            const prevQStart = addDays(prevQEnd, -lengthDays);
            return {
                current: { start: isoDate(qStart), end: todayIso },
                previous: { start: isoDate(prevQStart), end: isoDate(prevQEnd) },
                granularity: "month",
            };
        }
        case "ytd": {
            const yStart = new Date(today.getFullYear(), 0, 1);
            const prevYStart = new Date(today.getFullYear() - 1, 0, 1);
            const prevYEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            return {
                current: { start: isoDate(yStart), end: todayIso },
                previous: { start: isoDate(prevYStart), end: isoDate(prevYEnd) },
                granularity: "month",
            };
        }
        case "all":
        default: {
            return {
                current: { start: "1900-01-01", end: todayIso },
                previous: { start: "1900-01-01", end: "1900-01-01" },
                granularity: "month",
            };
        }
    }
}

export type AnalyticsKpi = { current: number; previous?: number };

export type AnalyticsResponse = {
    period: { start: string; end: string; granularity: "week" | "month" };
    kpis: {
        totalRevenue:  { current: number; previous: number };
        cashCollected: { current: number; previous: number };
        outstandingAR: { current: number };
        totalExpenses: { current: number; previous: number };
        activeJobs:    { current: number };
    };
    revenueChart: { start: string; revenue: number; jobs: number }[];
    jobProfitability: {
        id: string;
        jobTitle: string;
        status: string;
        quoted: number;
        revenue: number;
        expenses: number;
        marginAmount: number;
        marginPct: number;
        paidStatus: string;
    }[];
    arAging: { current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number };
    /** Echo of the period name the client requested. Used to suppress
     *  delta sublabels for "all" where the comparison is meaningless. */
    requestedPeriod: AnalyticsPeriod;
};

export const GET = withAuth(async (request, { supabase, user, tenantId }) => {
    const denied = await requirePermission(supabase, user.id, tenantId, "analytics.dashboard", "read");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const validation = analyticsQuerySchema.safeParse({
        period: searchParams.get("period") ?? undefined,
    });
    if (!validation.success) return validationError(validation.error);

    const { period } = validation.data;
    const { current, previous, granularity } = resolvePeriod(period);

    const { data, error } = await supabase.rpc("get_analytics_dashboard", {
        p_tenant_id: tenantId,
        p_period_start: current.start,
        p_period_end: current.end,
        p_prev_start: previous.start,
        p_prev_end: previous.end,
        p_granularity: granularity,
    });

    if (error) return serverError(error, "GET /api/analytics");

    const rpcData = (data ?? {}) as Omit<AnalyticsResponse, "requestedPeriod">;
    const response: AnalyticsResponse = { ...rpcData, requestedPeriod: period };
    return NextResponse.json(response);
});
