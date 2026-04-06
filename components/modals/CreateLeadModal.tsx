"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompanyOptions, useStatusConfig } from "@/lib/swr";
import { useTenantOptional } from "@/lib/tenant-context";
import { DEFAULT_LEAD_STAGES, getDefaultStatusId } from "@/lib/status-config";

interface CreateLeadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (lead: Record<string, unknown>) => void;
}

type Company = { id: string; name: string };

/** Modal for creating a new lead in your pipeline. */
export function CreateLeadModal({ open, onOpenChange, onCreated }: CreateLeadModalProps) {
    const [saving, setSaving] = useState(false);
    const [referenceId, setReferenceId] = useState("");
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [expectedCloseDate, setExpectedCloseDate] = useState("");

    const tenant = useTenantOptional();
    const { data: stageData } = useStatusConfig("lead");
    const defaultStage = getDefaultStatusId(stageData?.statuses ?? DEFAULT_LEAD_STAGES);
    const { data: companyData } = useCompanyOptions(open);
    const companies: Company[] = companyData?.items || [];

    const refPlaceholder = "Auto-generated";

    const reset = () => {
        setReferenceId("");
        setTitle("");
        setValue("");
        setCompanyId("");
        setExpectedCloseDate("");
    };

    useEffect(() => { if (!open) reset(); }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { toast.error("Lead name is required"); return; }

        setSaving(true);
        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    value: value ? parseFloat(value) : 0,
                    reference_id: referenceId.trim() || null,
                    company_id: companyId || null,
                    expected_close_date: expectedCloseDate || null,
                    stage: defaultStage,
                }),
            });
            if (!res.ok) {
                if (res.status === 409) {
                    toast.error("Duplicate reference ID — please use a unique ID");
                    return;
                }
                throw new Error("Failed to create lead");
            }
            const data = await res.json();
            toast.success("Lead created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create lead");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Lead</DialogTitle>
                    <DialogDescription>Create a new deal in your pipeline.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Reference ID</label>
                        <Input
                            placeholder={refPlaceholder}
                            value={referenceId}
                            onChange={(e) => setReferenceId(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Lead Name *</label>
                        <Input
                            autoFocus
                            placeholder=""
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company</label>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Select company...</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Value *</label>
                            <Input
                                placeholder="$0.00"
                                value={value}
                                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Expected Close Date</label>
                            <Input
                                type="date"
                                value={expectedCloseDate}
                                onChange={(e) => setExpectedCloseDate(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!title.trim() || saving}>
                            {saving ? "Creating..." : "Create Lead"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
