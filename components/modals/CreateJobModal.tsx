"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface CreateJobModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (job: any) => void;
}

type Company = { id: string; name: string };
type Opportunity = { id: string; title: string; company_id: string | null };
type User = { id: string; full_name: string | null; email: string | null };

export function CreateJobModal({ open, onOpenChange, onCreated }: CreateJobModalProps) {
    const [saving, setSaving] = useState(false);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [opportunityId, setOpportunityId] = useState("");
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (open) {
            fetch("/api/companies").then(r => r.json()).then(d => setCompanies(d.companies || [])).catch(() => {});
            fetch("/api/opportunities").then(r => r.json()).then(d => setOpportunities(d.opportunities || [])).catch(() => {});
            fetch("/api/users").then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {});
        }
    }, [open]);

    const filteredOpportunities = opportunities.filter(o => !companyId || o.company_id === companyId);

    const reset = () => {
        setDescription("");
        setAmount("");
        setCompanyId("");
        setOpportunityId("");
        setAssigneeIds([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !companyId) return;

        setSaving(true);
        try {
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description.trim(),
                    amount: amount ? parseFloat(amount) : 0,
                    company_id: companyId,
                    opportunity_id: opportunityId || null,
                    assignee_ids: assigneeIds,
                    status: "new",
                }),
            });
            if (!res.ok) throw new Error("Failed to create job");
            const data = await res.json();
            toast.success("Job created");
            onCreated?.(data.job);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Job</DialogTitle>
                    <DialogDescription>Create a new service job.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company *</label>
                        <select
                            value={companyId}
                            onChange={(e) => {
                                setCompanyId(e.target.value);
                                setOpportunityId("");
                            }}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            <option value="">Select company...</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Opportunity</label>
                        <select
                            value={opportunityId}
                            onChange={(e) => setOpportunityId(e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled={!companyId}
                        >
                            <option value="">{companyId ? "Select opportunity (optional)..." : "Select a company first"}</option>
                            {filteredOpportunities.map((o) => (
                                <option key={o.id} value={o.id}>{o.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Description *</label>
                        <Input
                            autoFocus
                            placeholder="Install solar panels at site"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="rounded-xl"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Cost</label>
                        <Input
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                            className="rounded-xl"
                        />
                    </div>

                    {/* Multi-assignee */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Assignees</label>
                        {assigneeIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {assigneeIds.map((uid) => {
                                    const u = users.find(u => u.id === uid);
                                    return (
                                        <span key={uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs font-medium">
                                            {u?.full_name || u?.email || uid}
                                            <button
                                                type="button"
                                                onClick={() => setAssigneeIds(prev => prev.filter(id => id !== uid))}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value && !assigneeIds.includes(e.target.value)) {
                                    setAssigneeIds(prev => [...prev, e.target.value]);
                                }
                            }}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Add assignee...</option>
                            {users.filter(u => !assigneeIds.includes(u.id)).map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!description.trim() || !companyId || saving}>
                            {saving ? "Creating..." : "Create Job"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
