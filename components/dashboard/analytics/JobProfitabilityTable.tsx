"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/dashboard/DataTable";
import { formatCurrency, cn } from "@/lib/utils";
import { getJobStatusDot, paidStatusTextClass } from "@/lib/design-system";
import type { AnalyticsResponse } from "@/lib/swr";

type JobRow = AnalyticsResponse["jobProfitability"][number];

interface JobProfitabilityTableProps {
    rows: JobRow[];
}

const columns: DataTableColumn<JobRow>[] = [
    {
        key: "jobTitle",
        label: "Job",
        render: (r) => (
            <div className="flex items-center gap-3">
                <span className={cn("w-2 h-2 rounded-full", getJobStatusDot(r.status))} />
                <span className="font-semibold">{r.jobTitle}</span>
            </div>
        ),
    },
    {
        key: "status",
        label: "Status",
        muted: true,
        className: "hidden md:table-cell capitalize",
        render: (r) => r.status.replace(/_/g, " ") || "—",
    },
    {
        key: "quoted",
        label: "Quoted",
        className: "text-right tabular-nums hidden md:table-cell",
        render: (r) => formatCurrency(r.quoted),
    },
    {
        key: "revenue",
        label: "Revenue",
        className: "text-right tabular-nums",
        render: (r) => formatCurrency(r.revenue),
    },
    {
        key: "expenses",
        label: "Expenses",
        className: "text-right tabular-nums",
        render: (r) => formatCurrency(r.expenses),
    },
    {
        key: "marginAmount",
        label: "Margin $",
        className: "text-right tabular-nums",
        render: (r) => (
            <span className={r.marginAmount >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                {formatCurrency(r.marginAmount)}
            </span>
        ),
    },
    {
        key: "marginPct",
        label: "Margin %",
        className: "text-right tabular-nums hidden lg:table-cell",
        render: (r) => (r.revenue > 0 ? `${r.marginPct.toFixed(1)}%` : "—"),
    },
    {
        key: "paidStatus",
        label: "Paid",
        className: "hidden lg:table-cell",
        render: (r) => (
            <span className={cn("text-xs font-semibold capitalize", paidStatusTextClass[r.paidStatus] ?? "text-muted-foreground")}>
                {r.paidStatus.replace(/_/g, " ")}
            </span>
        ),
    },
];

export function JobProfitabilityTable({ rows }: JobProfitabilityTableProps) {
    const router = useRouter();

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-border/40">
                <h2 className="text-sm font-bold tracking-tight">Job Profitability — Top 10</h2>
                <span className="text-xs text-muted-foreground">All-time totals, active jobs only</span>
            </div>
            <DataTable<JobRow>
                items={rows}
                columns={columns}
                emptyMessage="No active jobs to compare yet."
                onRowClick={(row) => router.push(`/dashboard/jobs/${row.id}`)}
            />
        </div>
    );
}
