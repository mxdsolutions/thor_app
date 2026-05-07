"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsResponse } from "@/lib/swr";

interface ARAgingChartProps {
    data: AnalyticsResponse["arAging"];
}

const BUCKET_COLOURS: Record<string, string> = {
    "Current":   "var(--foreground)",
    "1–30":      "#a1a1aa",
    "31–60":     "#f59e0b",
    "61–90":     "#f97316",
    "90+":       "#dc2626",
};

export function ARAgingChart({ data }: ARAgingChartProps) {
    const chartData = [
        { bucket: "Current", amount: data.current },
        { bucket: "1–30",    amount: data.d1_30 },
        { bucket: "31–60",   amount: data.d31_60 },
        { bucket: "61–90",   amount: data.d61_90 },
        { bucket: "90+",     amount: data.d90_plus },
    ];
    const total = chartData.reduce((acc, b) => acc + b.amount, 0);

    return (
        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-tight">Accounts Receivable Aging</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(total)} outstanding
                </span>
            </div>
            {total === 0 ? (
                <div className="h-[200px] md:h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    No outstanding receivables.
                </div>
            ) : (
                <div className="h-[200px] md:h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={48} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="bucket"
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
                                formatter={(value, _name, ctx) => {
                                    const payload = (ctx as unknown as { payload?: { bucket?: string } } | undefined)?.payload;
                                    const bucket = payload?.bucket;
                                    return [formatCurrency(Number(value ?? 0)), bucket ? `${bucket} days` : "Outstanding"];
                                }}
                            />
                            <Bar
                                dataKey="amount"
                                radius={[6, 6, 0, 0]}
                                fill="var(--foreground)"
                                // Per-bucket colour via shapeProps; recharts honours `fill` in payload
                                shape={(props: unknown) => {
                                    const p = props as { x: number; y: number; width: number; height: number; payload: { bucket: string } };
                                    const fill = BUCKET_COLOURS[p.payload.bucket] ?? "var(--foreground)";
                                    return (
                                        <rect
                                            x={p.x}
                                            y={p.y}
                                            width={p.width}
                                            height={p.height}
                                            fill={fill}
                                            rx={6}
                                            ry={6}
                                        />
                                    );
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
