import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    );
}

function TableRowSkeleton({ columns = 5, className }: { columns?: number; className?: string }) {
    return (
        <tr className={cn("border-b border-border/40", className)}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3.5">
                    <Skeleton className={cn("h-4 rounded", i === 0 ? "w-36" : "w-20")} />
                </td>
            ))}
        </tr>
    );
}

function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns} />
            ))}
        </>
    );
}

function KanbanSkeleton({ columns = 4, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
    return (
        <div className="flex gap-4 overflow-x-auto px-4 md:px-6 lg:px-10 pb-4">
            {Array.from({ length: columns }).map((_, col) => (
                <div key={col} className="flex-shrink-0 w-72 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-5 rounded-full ml-auto" />
                    </div>
                    {Array.from({ length: cardsPerColumn }).map((_, card) => (
                        <div key={card} className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-6 w-6 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function MetricsSkeleton({ count = 3 }: { count?: number }) {
    const desktopGrid = count > 3
        ? "md:grid-cols-2 lg:grid-cols-5"
        : "md:grid-cols-3";

    const card = (
        <div className="rounded-2xl border border-border p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile: horizontal scroll matching live StatCards */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1 md:hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="shrink-0 w-[75%] sm:w-[280px]">
                        {card}
                    </div>
                ))}
            </div>
            {/* md+: grid */}
            <div className={cn("hidden md:grid gap-3 px-4 md:px-6 lg:px-10", desktopGrid)}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i}>{card}</div>
                ))}
            </div>
        </>
    );
}

// Deterministic bar pattern — must be stable across server/client to avoid
// hydration mismatch. Visual variety only, no real meaning.
const BAR_HEIGHTS = [62, 38, 78, 54, 86, 44, 72, 58, 90, 48, 66, 80];

function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-2xl border border-border p-6 space-y-4", className)}>
            <Skeleton className="h-5 w-40" />
            <div className="flex items-end gap-2 h-48">
                {BAR_HEIGHTS.map((h, i) => (
                    <Skeleton
                        key={i}
                        className="flex-1 rounded-t"
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

export { Skeleton, TableRowSkeleton, TableSkeleton, KanbanSkeleton, MetricsSkeleton, ChartSkeleton };
