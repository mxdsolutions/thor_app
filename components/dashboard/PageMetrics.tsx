"use client";

import { cn } from "@/lib/utils";

export interface PageMetric {
    label: string;
    value: string | number;
    sublabel?: string;
    /** Render an orange accent strip along the top edge — reserve for the headline metric. */
    accent?: boolean;
    /** Optional tone for the value (defaults to foreground). */
    tone?: "default" | "warning" | "danger" | "success";
}

const toneClass: Record<NonNullable<PageMetric["tone"]>, string> = {
    default: "text-foreground",
    warning: "text-amber-600",
    danger: "text-rose-600",
    success: "text-emerald-600",
};

export function PageMetrics({ metrics, className }: { metrics: PageMetric[]; className?: string }) {
    return (
        <div
            className={cn(
                // Mobile: horizontal scroll with edge bleed
                "flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1",
                // md+: revert to 3-col grid
                "md:grid md:grid-cols-3 md:px-6 md:overflow-x-visible md:pb-0",
                "lg:px-10",
                className,
            )}
        >
            {metrics.map((m, i) => (
                <div
                    key={i}
                    className="relative overflow-hidden rounded-xl border border-border bg-card px-5 py-5 shrink-0 w-[75%] sm:w-[280px] md:w-auto"
                >
                    {m.accent && <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />}
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {m.label}
                    </div>
                    <div className={cn("text-2xl font-bold tracking-tight tabular-nums mt-1.5", toneClass[m.tone ?? "default"])}>
                        {m.value}
                    </div>
                    {m.sublabel && (
                        <div className="text-xs text-muted-foreground mt-1">{m.sublabel}</div>
                    )}
                </div>
            ))}
        </div>
    );
}
