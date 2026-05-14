"use client";

import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play as PlayIcon, Square as StopIcon, Clock as ClockIcon } from "lucide-react";
import { useActiveTimesheet, useJobOptions, refreshTimesheetCache } from "@/lib/swr";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";

type JobRow = { id: string; job_title: string; reference_id?: string | null };

type ActiveTimesheet = {
    id: string;
    start_at: string;
    job?: { id: string; job_title: string; reference_id?: string | null } | null;
    notes?: string | null;
};

/**
 * Clock-in / clock-out widget for the dashboard. When a timer is open it
 * shows a live elapsed display; when no timer is open it offers a job
 * picker plus a Start button.
 */
export function ClockInOutCard() {
    const { data, isLoading, mutate } = useActiveTimesheet();
    const active: ActiveTimesheet | null = data?.item ?? null;

    const { data: jobsData } = useJobOptions(!active);
    const jobOptions: EntityOption[] = (jobsData?.items ?? []).map((j: JobRow) => ({
        id: j.id,
        label: j.job_title,
        subtitle: j.reference_id || null,
    }));

    const [pendingJobId, setPendingJobId] = useState<string>("");
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    // Tick the elapsed display once a second while a timer is open. The
    // dependency is `active?.id` (not `active`) so the 30s SWR poll, which
    // returns a new object reference each time, doesn't tear down the tick.
    const activeId = active?.id;
    useEffect(() => {
        if (!activeId) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [activeId]);

    const elapsedMs = active ? Math.max(0, now - new Date(active.start_at).getTime()) : 0;

    const clockIn = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/timesheets/clock-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: pendingJobId || null }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to clock in");
            }
            toast.success("Clocked in");
            setPendingJobId("");
            await mutate();
            refreshTimesheetCache();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to clock in");
        } finally {
            setBusy(false);
        }
    };

    const clockOut = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/timesheets/clock-out", { method: "POST" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to clock out");
            }
            toast.success(`Clocked out · ${formatDuration(elapsedMs)}`);
            await mutate();
            refreshTimesheetCache();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to clock out");
        } finally {
            setBusy(false);
        }
    };

    const startedLabel = active
        ? new Date(active.start_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
        : null;

    return (
        <Card className="rounded-2xl">
            <CardContent className="p-3 md:p-4">
                {isLoading ? (
                    <div className="h-10 rounded-xl bg-secondary/40 animate-pulse" />
                ) : active ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <div className="font-statement text-2xl md:text-3xl font-bold tabular-nums shrink-0">
                                {formatDuration(elapsedMs)}
                            </div>
                            <div className="text-sm text-muted-foreground truncate min-w-0">
                                {active.job ? (
                                    <>
                                        On <span className="font-medium text-foreground">{active.job.job_title}</span>
                                        {active.job.reference_id ? ` · ${active.job.reference_id}` : ""}
                                    </>
                                ) : (
                                    "No job selected"
                                )}
                                <span className="text-muted-foreground/70"> · Started {startedLabel}</span>
                            </div>
                        </div>
                        <Button onClick={clockOut} disabled={busy} variant="destructive" className="gap-2 shrink-0">
                            <StopIcon className="w-4 h-4" />
                            Clock out
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground md:shrink-0">
                            <ClockIcon className="w-3.5 h-3.5" />
                            Time clock
                        </div>
                        <div className="flex-1 min-w-0">
                            <EntitySearchDropdown
                                value={pendingJobId}
                                onChange={(id) => setPendingJobId(id)}
                                options={jobOptions}
                                placeholder="Pick a job (optional)"
                                entityType="job"
                                onCreated={() => globalMutate("/api/jobs?limit=200")}
                            />
                        </div>
                        <Button onClick={clockIn} disabled={busy} className="gap-2 shrink-0">
                            <PlayIcon className="w-4 h-4" />
                            Clock in
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
