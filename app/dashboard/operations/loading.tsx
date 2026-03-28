export default function OperationsLoading() {
    return (
        <div className="space-y-6 pb-12 w-full pt-6 lg:pt-8">
            <div className="px-4 md:px-6 lg:px-10 space-y-2">
                <div className="h-7 w-48 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-64 bg-muted/60 animate-pulse rounded-md" />
            </div>
            <div className="px-4 md:px-6 lg:px-10">
                <div className="space-y-0">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border/40">
                            <div className="h-9 w-9 bg-muted animate-pulse rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 bg-muted animate-pulse rounded" style={{ width: `${35 + (i % 3) * 10}%` }} />
                                <div className="h-3 bg-muted/50 animate-pulse rounded w-24" />
                            </div>
                            <div className="h-4 w-16 bg-muted animate-pulse rounded hidden sm:block" />
                            <div className="h-4 w-20 bg-muted animate-pulse rounded hidden md:block" />
                            <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
