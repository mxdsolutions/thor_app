"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobSearchSelect } from "@/components/ui/job-search-select";
import { toast } from "sonner";
import type { ScheduleEntry } from "@/components/schedule/types";

interface ScheduleEntryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
    /** If provided, edit this entry; otherwise create new */
    entry?: ScheduleEntry | null;
    /** Pre-fill date when creating from a calendar day click */
    defaultDate?: string;
}

export function ScheduleEntryModal({
    open,
    onOpenChange,
    onSaved,
    entry,
    defaultDate,
}: ScheduleEntryModalProps) {
    const isEditing = !!entry;
    const [saving, setSaving] = useState(false);
    const [jobId, setJobId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [notes, setNotes] = useState("");

    const reset = () => {
        setJobId("");
        setDate("");
        setStartTime("");
        setEndTime("");
        setNotes("");
    };

    useEffect(() => {
        if (!open) {
            reset();
            return;
        }
        if (entry) {
            setJobId(entry.job_id);
            setDate(entry.date);
            setStartTime(entry.start_time || "");
            setEndTime(entry.end_time || "");
            setNotes(entry.notes || "");
        } else {
            if (defaultDate) setDate(defaultDate);
            setStartTime("09:00");
            setEndTime("18:00");
        }
    }, [open, entry, defaultDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEditing && !jobId) {
            toast.error("Please select a job");
            return;
        }
        if (!date) {
            toast.error("Date is required");
            return;
        }

        setSaving(true);
        try {
            if (isEditing) {
                const res = await fetch("/api/schedule", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: entry!.id,
                        date,
                        start_time: startTime || null,
                        end_time: endTime || null,
                        notes: notes || null,
                    }),
                });
                if (!res.ok) throw new Error("Failed to update");
                toast.success("Schedule entry updated");
            } else {
                const res = await fetch("/api/schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        job_id: jobId,
                        date,
                        start_time: startTime || null,
                        end_time: endTime || null,
                        notes: notes || null,
                    }),
                });
                if (!res.ok) throw new Error("Failed to create");
                toast.success("Job scheduled");
            }
            onSaved?.();
            onOpenChange(false);
        } catch {
            toast.error(isEditing ? "Failed to update entry" : "Failed to schedule job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Schedule Entry" : "Schedule Job"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the date, time, or notes for this entry."
                            : "Add a job to the schedule."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Job selector (only for new entries) */}
                    {!isEditing && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Job</label>
                            <JobSearchSelect
                                value={jobId}
                                onChange={setJobId}
                                placeholder="Search jobs..."
                            />
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Date</label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="rounded-xl border-border/50"
                        />
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Start Time</label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="rounded-xl border-border/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">End Time</label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="rounded-xl border-border/50"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Notes</label>
                        <Input
                            placeholder="e.g., Weather delay, split day..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="rounded-xl border-border/50"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving
                                ? "Saving..."
                                : isEditing
                                  ? "Update"
                                  : "Schedule"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
