"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import { Clock as ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { useJobOptions, refreshTimesheetCache } from "@/lib/swr";
import { cn, combineDateTime, formatDuration } from "@/lib/utils";

const inlineFieldChrome =
    "text-[15px] text-foreground bg-muted/40 border border-border rounded-lg py-1.5 px-2.5 " +
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-shadow";

export type TimesheetSideSheetItem = {
    id: string;
    user_id: string;
    job_id: string | null;
    start_at: string;
    end_at: string | null;
    notes: string | null;
    source: string;
    archived_at?: string | null;
    user?: { id: string; full_name: string | null; email: string | null } | null;
    job?: { id: string; job_title: string; reference_id?: string | null } | null;
};

interface Props {
    timesheet: TimesheetSideSheetItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

type JobRow = { id: string; job_title: string; reference_id?: string | null };

const pad2 = (n: number) => n.toString().padStart(2, "0");

function splitISO(iso: string | null): { date: string; time: string } {
    if (!iso) return { date: "", time: "" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    return {
        date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
        time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    };
}

export function TimesheetSideSheet({ timesheet, open, onOpenChange, onUpdate }: Props) {
    const [data, setData] = useState<TimesheetSideSheetItem | null>(timesheet);
    useEffect(() => { setData(timesheet); }, [timesheet]);

    const { data: jobsData } = useJobOptions(open && !!data);
    const jobOptions: EntityOption[] = useMemo(
        () => (jobsData?.items ?? []).map((j: JobRow) => ({
            id: j.id,
            label: j.job_title,
            subtitle: j.reference_id || null,
        })),
        [jobsData],
    );

    const archive = useArchiveAction({
        entityName: "timesheet",
        endpoint: data ? `/api/timesheets/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            refreshTimesheetCache();
            onUpdate?.();
        },
    });

    const patch = useCallback(async (updates: Partial<TimesheetSideSheetItem>) => {
        if (!data) return;
        const res = await fetch("/api/timesheets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, ...updates }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to save");
            return;
        }
        const json = await res.json();
        setData(json.item);
        refreshTimesheetCache();
        onUpdate?.();
    }, [data, onUpdate]);

    if (!data) return null;

    const start = splitISO(data.start_at);
    const end = splitISO(data.end_at);
    const running = data.end_at == null;
    const ms = data.end_at
        ? Math.max(0, new Date(data.end_at).getTime() - new Date(data.start_at).getTime())
        : 0;

    const employeeName = data.user?.full_name || data.user?.email || "Unknown";
    const tabs = [{ id: "details", label: "Details" }];
    const subtitle = [
        data.job?.job_title || "No job",
        new Date(data.start_at).toLocaleDateString("en-AU", { dateStyle: "medium" }),
    ].filter(Boolean).join(" · ");
    const totalLabel = running ? "Running" : formatDuration(ms);

    /** Persist a start/end change. Reads the *other* side from current data so
     *  changing just one input doesn't blow away the other. */
    const saveBoundary = (which: "start" | "end", date: string, time: string) => {
        const next = combineDateTime(date, time);
        if (which === "start") {
            if (!next) return;
            // Don't allow start to land after end.
            if (data.end_at && next > new Date(data.end_at)) {
                toast.error("Start must be before end");
                return;
            }
            void patch({ start_at: next.toISOString() });
        } else {
            // Allow clearing end_at to reopen as a running timer? No — keep it
            // closed; reopening would conflict with the partial unique index.
            if (!next) return;
            if (next < new Date(data.start_at)) {
                toast.error("End must be after start");
                return;
            }
            void patch({ end_at: next.toISOString() });
        }
    };

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<ClockIcon className="w-7 h-7 text-sky-600" />}
            iconBg="bg-sky-500/10"
            title={employeeName}
            subtitle={subtitle}
            badge={{
                label: totalLabel,
                dotColor: running ? "bg-emerald-500" : "bg-sky-500",
            }}
            actions={archive.menu}
            banner={archive.banner}
            tabs={tabs}
            activeTab="details"
            onTabChange={() => { /* single tab */ }}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <Field label="Job">
                        <EntitySearchDropdown
                            value={data.job_id ?? ""}
                            onChange={(id) => void patch({ job_id: id || null })}
                            options={jobOptions}
                            placeholder="Search jobs..."
                            entityType="job"
                            className="w-full sm:max-w-[260px]"
                        />
                    </Field>

                    <Field label="Date">
                        <input
                            type="date"
                            defaultValue={start.date}
                            onBlur={(e) => {
                                const v = e.target.value;
                                if (v && v !== start.date) saveBoundary("start", v, start.time);
                                if (data.end_at && v && v !== end.date) saveBoundary("end", v, end.time);
                            }}
                            className={cn(inlineFieldChrome, "w-[140px]")}
                        />
                    </Field>

                    <Field label="Start">
                        <input
                            type="time"
                            defaultValue={start.time}
                            onBlur={(e) => {
                                const v = e.target.value;
                                if (v && v !== start.time) saveBoundary("start", start.date, v);
                            }}
                            className={cn(inlineFieldChrome, "w-[110px]")}
                        />
                    </Field>

                    <Field label="End">
                        {running ? (
                            <span className="text-sm text-emerald-600 font-medium">Running</span>
                        ) : (
                            <input
                                type="time"
                                defaultValue={end.time}
                                onBlur={(e) => {
                                    const v = e.target.value;
                                    if (v && v !== end.time) saveBoundary("end", end.date, v);
                                }}
                                className={cn(inlineFieldChrome, "w-[110px]")}
                            />
                        )}
                    </Field>

                    <Field label="Source">
                        <span className="text-sm text-muted-foreground capitalize">{data.source}</span>
                    </Field>

                    <Field label="Notes">
                        <textarea
                            rows={3}
                            defaultValue={data.notes ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (data.notes ?? null)) void patch({ notes: v });
                            }}
                            className={cn(inlineFieldChrome, "w-full resize-none")}
                        />
                    </Field>
                </div>
            </div>
        </SideSheetLayout>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground shrink-0 pt-1.5">{label}</span>
            <div className="flex-1 flex justify-end">{children}</div>
        </div>
    );
}
