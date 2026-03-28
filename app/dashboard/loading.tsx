export default function DashboardLoading() {
    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-200">
            {/* Header skeleton */}
            <div className="px-4 md:px-6 lg:px-10 space-y-2">
                <div className="h-7 w-48 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-72 bg-muted/60 animate-pulse rounded-md" />
            </div>

            {/* Content skeleton */}
            <div className="px-4 md:px-6 lg:px-10">
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3">
                            <div className="h-9 w-9 bg-muted animate-pulse rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                                <div className="h-3 bg-muted/60 animate-pulse rounded w-1/5" />
                            </div>
                            <div className="h-4 w-16 bg-muted animate-pulse rounded hidden sm:block" />
                            <div className="h-4 w-20 bg-muted animate-pulse rounded hidden sm:block" />
                            <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
