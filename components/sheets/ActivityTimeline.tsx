"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

type FieldDiff = { old: unknown; new: unknown };

type Activity = {
    id: string;
    action: string;
    // Default trigger-driven events use { field: { old, new } }; custom semantic
    // events (link_sent, submitted, link_bounced) carry flat metadata instead.
    changes: Record<string, unknown> | null;
    created_at: string;
    entity_type?: string;
    entity_id?: string;
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
    deleted: { label: "Removed", color: "bg-rose-500", icon: "−" },
    status_changed: { label: "Status changed", color: "bg-amber-500", icon: "→" },
    stage_changed: { label: "Stage changed", color: "bg-indigo-500", icon: "→" },
    note_added: { label: "Note added", color: "bg-violet-500", icon: "✎" },
    archived: { label: "Archived", color: "bg-zinc-500", icon: "⊘" },
    restored: { label: "Restored", color: "bg-emerald-500", icon: "↺" },
    link_generated: { label: "Link generated", color: "bg-sky-500", icon: "↗" },
    link_sent: { label: "Link sent", color: "bg-sky-500", icon: "✉" },
    link_bounced: { label: "Link bounced", color: "bg-rose-500", icon: "!" },
    submitted: { label: "Submitted", color: "bg-emerald-500", icon: "✓" },
};

// Maps trigger entity_type values to human labels for the prefix shown when an
// event is bubbling up under a parent (e.g., a quote event under a job).
const entityTypeLabels: Record<string, string> = {
    job: "Job",
    quote: "Quote",
    invoice: "Invoice",
    report: "Report",
    job_schedule_entry: "Appointment",
    job_assignee: "Assignee",
    job_line_item: "Service",
    quote_line_item: "Quote line item",
    quote_section: "Quote section",
    invoice_line_item: "Invoice line item",
};

function formatFieldName(field: string) {
    return field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val: unknown): string {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return val.toString();
    if (typeof val === "string") {
        return val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
    if (Array.isArray(val)) return `[${val.length} items]`;
    const s = JSON.stringify(val);
    return s.length > 60 ? "(updated)" : s;
}

function isFieldDiff(v: unknown): v is FieldDiff {
    return typeof v === "object" && v !== null && ("old" in v || "new" in v);
}

// External submissions have performed_by=null. Fall back to the submitter
// metadata carried in `changes` so the row reads "by Alice" not "by System".
function performerLabel(activity: Activity): string {
    if (activity.performer?.full_name) return activity.performer.full_name;
    const c = activity.changes ?? {};
    if (activity.action === "submitted") {
        if (typeof c.submitted_by_name === "string" && c.submitted_by_name) return c.submitted_by_name;
        if (typeof c.submitted_by_email === "string" && c.submitted_by_email) return c.submitted_by_email;
    }
    return "System";
}

function renderActionDetail(activity: Activity) {
    const c = activity.changes ?? {};

    if (activity.action === "link_sent" || activity.action === "link_bounced") {
        const email = typeof c.recipient_email === "string" ? c.recipient_email : null;
        const name = typeof c.recipient_name === "string" && c.recipient_name ? c.recipient_name : null;
        const display = name && email ? `${name} <${email}>` : (email ?? name);
        if (!display) return null;
        return (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
                <span className="text-foreground/80">{display}</span>
            </div>
        );
    }

    if (activity.action === "status_changed") {
        const status = c.status;
        if (!isFieldDiff(status)) return null;
        return (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
                <span className="line-through text-muted-foreground/50">{formatValue(status.old)}</span>
                {" → "}
                <span className="text-foreground/80">{formatValue(status.new)}</span>
            </div>
        );
    }

    // submitted, link_generated, archived, restored, updated, created — no detail line.
    if ([
        "submitted", "link_generated", "archived", "restored", "updated", "created", "deleted",
    ].includes(activity.action)) {
        return null;
    }

    // Default: render trigger-style { field: { old, new } } diffs.
    const entries = Object.entries(c).filter(([, v]) => isFieldDiff(v)) as Array<[string, FieldDiff]>;
    if (entries.length === 0) return null;
    return (
        <div className="mt-1.5 space-y-1">
            {entries.map(([field, change]) => (
                <div key={field} className="text-[11px] text-muted-foreground">
                    <span className="font-medium">{formatFieldName(field)}</span>{" "}
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
    );
}

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    // For a job's activity tab we want events bubbling up from quotes/invoices/etc.,
    // so we ask the API to aggregate the job's descendants into the feed.
    const aggregate = entityType === "job";

    const fetchActivity = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                entity_type: entityType,
                entity_id: entityId,
            });
            if (aggregate) params.set("aggregate", "related");
            const res = await fetch(`/api/activity?${params.toString()}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setActivities(data.activities || []);
        } catch {
            toast.error("Failed to load activity");
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, aggregate]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

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
                    // Show the entity-type prefix when the event is from a related entity
                    // bubbled up to the parent feed (e.g., Quote event on a Job's tab).
                    const showPrefix = activity.entity_type && activity.entity_type !== entityType;
                    const prefix = showPrefix
                        ? entityTypeLabels[activity.entity_type!] ?? activity.entity_type
                        : null;

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
                                    {prefix && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                                            {prefix}
                                        </span>
                                    )}
                                    <span className="text-xs font-semibold text-foreground">
                                        {config.label}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        by {performerLabel(activity)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                                        {timeAgo(activity.created_at)}
                                    </span>
                                </div>

                                {renderActionDetail(activity)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
