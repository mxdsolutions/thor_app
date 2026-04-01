"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (report: any) => void;
}

type JobOption = { id: string; description: string };
type ProjectOption = { id: string; title: string };

const REPORT_TYPES = [
    { value: "assessment", label: "Assessment" },
    { value: "defect", label: "Defect" },
    { value: "inspection", label: "Inspection" },
    { value: "make_safe", label: "Make Safe" },
    { value: "specialist", label: "Specialist" },
    { value: "variation", label: "Variation" },
    { value: "roof", label: "Roof" },
    { value: "other", label: "Other" },
];

export function CreateReportModal({ open, onOpenChange, onCreated }: CreateReportModalProps) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [type, setType] = useState("");
    const [jobId, setJobId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [notes, setNotes] = useState("");
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);

    useEffect(() => {
        if (open) {
            fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {});
            fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects || [])).catch(() => {});
        }
    }, [open]);

    const reset = () => {
        setTitle("");
        setType("");
        setJobId("");
        setProjectId("");
        setNotes("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !type) return;

        setSaving(true);
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    type,
                    job_id: jobId || null,
                    project_id: projectId || null,
                    notes: notes.trim() || null,
                    status: "draft",
                }),
            });
            if (!res.ok) throw new Error("Failed to create report");
            const data = await res.json();
            toast.success("Report created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create report");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Report</DialogTitle>
                    <DialogDescription>Create a new construction report.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Title *</label>
                        <Input
                            autoFocus
                            placeholder="Report title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Type *</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Select type...</option>
                            {REPORT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Job</label>
                            <select
                                value={jobId}
                                onChange={(e) => setJobId(e.target.value)}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">None</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.description}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Project</label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">None</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                        <textarea
                            placeholder="Additional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!title.trim() || !type || saving}>
                            {saving ? "Creating..." : "Create Report"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
