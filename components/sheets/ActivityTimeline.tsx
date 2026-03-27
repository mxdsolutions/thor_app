"use client";

import { useState, useEffect } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

type Activity = {
    id: string;
    action: string;
    changes: Record<string, { old: string; new: string }> | null;
    created_at: string;
    performer?: {
        id: string;
        full_name: string;
    } | null;
};

interface ActivityTimelineProps {
    entityType: string;
    entityId: string;
}

const actionConfig: Record<string, { label: string; color: string; icon: string }> = {
    created: { label: "Created", color: "bg-emerald-500", icon: "+" },
    updated: { label: "Updated", color: "bg-blue-500", icon: "~" },
    status_changed: { label: "Status changed", color: "bg-amber-500", icon: "→" },
    stage_changed: { label: "Stage changed", color: "bg-indigo-500", icon: "→" },
    note_added: { label: "Note added", color: "bg-violet-500", icon: "✎" },
};

function formatFieldName(field: string) {
    return field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val: string | null | undefined) {
    if (val === null || val === undefined || val === "") return "—";
    return val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivity();
    }, [entityType, entityId]);

    const fetchActivity = async () => {
        try {
            const res = await fetch(`/api/activity?entity_type=${entityType}&entity_id=${entityId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setActivities(data.activities || []);
        } catch {
            toast.error("Failed to load activity");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-muted rounded-full w-2/3" />
                            <div className="h-3 bg-muted rounded-full w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

            <div className="space-y-4">
                {activities.map((activity) => {
                    const config = actionConfig[activity.action] || actionConfig.updated;

                    return (
                        <div key={activity.id} className="flex gap-3 relative">
                            {/* Dot */}
                            <div className={cn(
                                "w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold z-10",
                                config.color
                            )}>
                                {config.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground">
                                        {config.label}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        by {activity.performer?.full_name || "System"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                                        {timeAgo(activity.created_at)}
                                    </span>
                                </div>

                                {/* Show changes */}
                                {activity.changes && Object.keys(activity.changes).length > 0 && (
                                    <div className="mt-1.5 space-y-1">
                                        {Object.entries(activity.changes).map(([field, change]) => (
                                            <div key={field} className="text-[11px] text-muted-foreground">
                                                <span className="font-medium">{formatFieldName(field)}</span>
                                                {" "}
                                                {change.old != null && (
                                                    <>
                                                        <span className="line-through text-muted-foreground/50">{formatValue(change.old)}</span>
                                                        {" → "}
                                                    </>
                                                )}
                                                <span className="text-foreground/80">{formatValue(change.new)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
