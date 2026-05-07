"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Bucket = { start: string; revenue: number; jobs: number };

interface RevenueTrendChartProps {
    data: Bucket[];
    granularity: "week" | "month";
}

function labelFor(start: string, granularity: "week" | "month"): string {
    const d = new Date(start);
    if (granularity === "week") {
        return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    }
    return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

export function RevenueTrendChart({ data, granularity }: RevenueTrendChartProps) {
    const chartData = data.map((b) => ({ ...b, label: labelFor(b.start, granularity) }));
    const hasAnyRevenue = chartData.some((b) => b.revenue > 0);

    return (
        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-tight">Revenue</h2>
                <span className="text-xs text-muted-foreground capitalize">{granularity}ly</span>
            </div>
            {!hasAnyRevenue ? (
                <div className="h-[200px] md:h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    No revenue invoiced in this period.
                </div>
            ) : (
                <div className="h-[200px] md:h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={24} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                                width={45}
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
                            <Bar dataKey="revenue" fill="var(--foreground)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
