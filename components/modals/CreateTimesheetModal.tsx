"use client";

import { useEffect, useMemo, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { DatePicker, TimePicker } from "@/components/ui/date-time-input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import { useJobOptions, useProfiles, refreshTimesheetCache } from "@/lib/swr";
import { useFormSubmit } from "@/lib/hooks/use-form-submit";
import { formatDuration, todayISODate, nowHHMM, combineDateTime } from "@/lib/utils";
import { timesheetSchema } from "@/lib/validation";

type ProfileUser = {
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string | null };
};

type JobRow = { id: string; job_title: string; reference_id?: string | null };

interface CreateTimesheetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Pre-fill the job — used when launched from a job's Expenses tab. */
    defaultJobId?: string | null;
    /** Pre-fill the employee — typically the current user. */
    defaultUserId?: string | null;
    onCreated?: () => void;
}

export function CreateTimesheetModal({
    open,
    onOpenChange,
    defaultJobId,
    defaultUserId,
    onCreated,
}: CreateTimesheetModalProps) {
    const { data: profilesData } = useProfiles();
    const { data: jobsData } = useJobOptions(open);

    const [userId, setUserId] = useState<string>("");
    const [jobId, setJobId] = useState<string>("");
    const [date, setDate] = useState<string>(todayISODate());
    const [startTime, setStartTime] = useState<string>(nowHHMM());
    const [endTime, setEndTime] = useState<string>("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) return;
        setUserId(defaultUserId ?? "");
        setJobId(defaultJobId ?? "");
        setDate(todayISODate());
        setStartTime(nowHHMM());
        setEndTime("");
        setNotes("");
    }, [open, defaultJobId, defaultUserId]);

    const users: ProfileUser[] = useMemo(
        () => profilesData?.users ?? [],
        [profilesData],
    );

    const jobOptions: EntityOption[] = useMemo(
        () => (jobsData?.items ?? []).map((j: JobRow) => ({
            id: j.id,
            label: j.job_title,
            subtitle: j.reference_id || null,
        })),
        [jobsData],
    );

    const startAt = combineDateTime(date, startTime);
    const endAt = combineDateTime(date, endTime);
    const durationMs = startAt && endAt && endAt >= startAt ? endAt.getTime() - startAt.getTime() : 0;

    const { saving, submit } = useFormSubmit({
        url: "/api/timesheets",
        schema: timesheetSchema,
        successMessage: "Timesheet saved",
        onSuccess: () => {
            refreshTimesheetCache();
            onCreated?.();
            onOpenChange(false);
        },
    });

    const canSave = !!userId && !!startAt && !!endAt && endAt > startAt && !saving;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave || !startAt || !endAt) return;
        await submit({
            user_id: userId,
            job_id: jobId || null,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            notes: notes.trim() || null,
            source: "manual",
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add timesheet entry</DialogTitle>
                    <DialogDescription>
                        Log hours worked. Pick an employee, a job (optional), and the time range.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-4 pb-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Employee</label>
                            <Select value={userId} onValueChange={setUserId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pick an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.user_metadata?.full_name || u.email || u.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Job</label>
                            <EntitySearchDropdown
                                value={jobId}
                                onChange={(id) => setJobId(id)}
                                options={jobOptions}
                                placeholder="Search jobs..."
                                entityType="job"
                                onCreated={() => {
                                    void globalMutate("/api/jobs?limit=200");
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Date</label>
                                <DatePicker value={date} onChange={setDate} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Start</label>
                                <TimePicker value={startTime} onChange={setStartTime} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">End</label>
                                <TimePicker value={endTime} onChange={setEndTime} />
                            </div>
                        </div>

                        <div className="rounded-xl border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total</span>
                            <span className="font-display text-lg font-semibold tabular-nums">
                                {durationMs > 0 ? formatDuration(durationMs) : "—"}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Notes</label>
                            <textarea
                                rows={3}
                                placeholder="Optional"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSave}>
                            {saving ? "Saving…" : "Save timesheet"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
