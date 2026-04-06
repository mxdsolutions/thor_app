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
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { toast } from "sonner";

type DraftLineItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
};

interface CreateJobFromLeadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    leadTitle: string;
    companyId: string | null;
    companyName: string | null;
    onCreated?: (job: any) => void;
}

export function CreateJobFromLeadModal({
    open,
    onOpenChange,
    leadId,
    leadTitle,
    companyId,
    companyName,
    onCreated,
}: CreateJobFromLeadModalProps) {
    const [description, setDescription] = useState("");
    const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
    const [assignedTo, setAssignedTo] = useState("");
    const [services, setServices] = useState<{ id: string; name: string; initial_value: number | null }[]>([]);

    useEffect(() => {
        if (!open) {
            setDescription("");
            setLineItems([]);
            setAssignedTo("");
            return;
        }
        if (!leadId) return;

        setDescription(leadTitle);
        setLoading(true);

        Promise.all([
            fetch(`/api/lead-line-items?lead_id=${leadId}`).then((r) => r.json()),
            fetch("/api/users").then((r) => r.json()),
            fetch("/api/services").then((r) => r.json()),
        ])
            .then(([liData, userData, prodData]) => {
                const items = (liData.lineItems || []).map((li: any) => ({
                    product_id: li.product_id,
                    product_name: li.product?.name || "Unknown",
                    quantity: li.quantity,
                    unit_price: li.unit_price,
                }));
                setLineItems(items);
                setUsers(userData.users || []);
                setServices((prodData.items || []).filter((p: any) => p.status === "active"));
            })
            .catch(() => toast.error("Failed to load data"))
            .finally(() => setLoading(false));
    }, [open, leadId, leadTitle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) { toast.error("Job description is required"); return; }

        setSaving(true);
        try {
            const res = await fetch("/api/jobs/from-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead_id: leadId,
                    description: description.trim(),
                    company_id: companyId,
                    assigned_to: assignedTo || null,
                    line_items: lineItems.map((li) => ({
                        product_id: li.product_id,
                        product_name: li.product_name,
                        quantity: li.quantity,
                        unit_price: li.unit_price,
                    })),
                }),
            });

            if (!res.ok) throw new Error();

            const data = await res.json();
            toast.success("Job created from lead");
            onCreated?.(data.item);
            onOpenChange(false);
        } catch {
            toast.error("Failed to create job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create Job from Lead</DialogTitle>
                    <DialogDescription>
                        Review and edit the line items before creating the job. Each line item will also create a project.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2 min-h-0">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Job Description *</label>
                            <Input
                                autoFocus
                                placeholder="Job description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="rounded-xl"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Company</label>
                                <Input value={companyName || "—"} disabled className="rounded-xl bg-muted" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                                <select
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">Unassigned</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5 min-h-0 flex flex-col">
                            <label className="text-xs font-medium text-muted-foreground">
                                Line Items {lineItems.length > 0 && `(${lineItems.length})`}
                            </label>
                            <LineItemsTable
                                mode="draft"
                                items={lineItems}
                                services={services}
                                onItemsChange={setLineItems}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!description.trim() || saving}>
                                {saving ? "Creating..." : "Create Job"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
