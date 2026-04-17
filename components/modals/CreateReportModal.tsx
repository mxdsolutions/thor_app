"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobSearchSelect, type JobSearchOption } from "@/components/ui/job-search-select";
import { toast } from "sonner";
import { useReportTemplates, useJobs } from "@/lib/swr";
import type { ReportTemplate } from "@/lib/report-templates/types";

interface CreateReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (report: Record<string, unknown>) => void;
    defaultValues?: { job_id?: string; company_id?: string };
}

const REPORT_TYPES = [
    { value: "assessment", label: "Assessment" },
    { value: "defect", label: "Defect" },
    { value: "inspection", label: "Inspection" },
    { value: "make_safe", label: "Make Safe" },
    { value: "specialist", label: "Specialist" },
    { value: "variation", label: "Variation" },
    { value: "roof", label: "Roof" },
    { value: "rectification", label: "Rectification" },
    { value: "reinspection", label: "Reinspection" },
    { value: "other", label: "Other" },
];

function buildAutoTitle(template: ReportTemplate | null, job: JobSearchOption | null): string {
    if (!template || !job) return "";
    const contactName = job.contact
        ? [job.contact.first_name, job.contact.last_name].filter(Boolean).join(" ").trim()
        : "";
    const parts = [template.name, contactName, job.reference_id].filter((p): p is string => !!p);
    return parts.join(" - ");
}

export function CreateReportModal({ open, onOpenChange, onCreated, defaultValues }: CreateReportModalProps) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [type, setType] = useState("");
    const [templateId, setTemplateId] = useState("");
    const [jobId, setJobId] = useState(defaultValues?.job_id || "");
    const [notes, setNotes] = useState("");

    const { data: templatesData } = useReportTemplates();
    const { data: jobsData, mutate: mutateJobs } = useJobs();

    const templates: ReportTemplate[] = useMemo(() => templatesData?.items || [], [templatesData]);
    const jobs: JobSearchOption[] = useMemo(() => (jobsData?.items || []) as JobSearchOption[], [jobsData]);

    const selectedTemplate = useMemo(
        () => templates.find((t) => t.id === templateId) ?? null,
        [templates, templateId]
    );
    const selectedJob = useMemo(
        () => jobs.find((j) => j.id === jobId) ?? null,
        [jobs, jobId]
    );

    // Tracks the last auto-generated title. If the current title matches it,
    // the user hasn't customized — safe to re-fill as template/job change.
    const lastAutoTitleRef = useRef("");

    // Auto-populate title whenever template or job changes.
    useEffect(() => {
        if (!open) return;
        const autoTitle = buildAutoTitle(selectedTemplate, selectedJob);
        if (!autoTitle) return;
        setTitle((current) => {
            if (current === "" || current === lastAutoTitleRef.current) {
                lastAutoTitleRef.current = autoTitle;
                return autoTitle;
            }
            return current;
        });
    }, [selectedTemplate, selectedJob, open]);

    // Adopt the template's category as the default type on template select.
    useEffect(() => {
        if (selectedTemplate?.category && !type) {
            setType(selectedTemplate.category);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemplate?.id]);

    const reset = () => {
        setTitle("");
        setType("");
        setTemplateId("");
        setJobId("");
        setNotes("");
        lastAutoTitleRef.current = "";
    };

    useEffect(() => { if (!open) reset(); }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { toast.error("Report title is required"); return; }
        if (!type) { toast.error("Report type is required"); return; }

        setSaving(true);
        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    type,
                    template_id: templateId || null,
                    job_id: jobId || null,
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Report</DialogTitle>
                    <DialogDescription>Create a new construction report.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {templates.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Template</label>
                            <select
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">No template (blank report)</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Job</label>
                        <JobSearchSelect
                            value={jobId}
                            onChange={setJobId}
                            placeholder="Search or create job..."
                            allowCreate
                            onCreated={() => mutateJobs()}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Title *</label>
                        <Input
                            placeholder="Report title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Type *</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Select type...</option>
                            {REPORT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
                        <textarea
                            placeholder="Additional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
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
