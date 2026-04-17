"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompanies, useContacts, useJobs } from "@/lib/swr";

interface CreateInvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (invoice: Record<string, unknown>) => void;
    defaultValues?: { company_id?: string; job_id?: string };
}

type LineItem = {
    description: string;
    quantity: number;
    unit_price: number;
    account_code: string;
};

export function CreateInvoiceModal({ open, onOpenChange, onCreated, defaultValues }: CreateInvoiceModalProps) {
    const [saving, setSaving] = useState(false);
    const [reference, setReference] = useState("");
    const [companyId, setCompanyId] = useState(defaultValues?.company_id || "");
    const [contactId, setContactId] = useState("");
    const [jobId, setJobId] = useState(defaultValues?.job_id || "");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [gstInclusive, setGstInclusive] = useState(true);
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: "", quantity: 1, unit_price: 0, account_code: "" },
    ]);

    const { data: companiesData } = useCompanies();
    const { data: contactsData } = useContacts();
    const { data: jobsData } = useJobs();

    const companies = companiesData?.items || [];
    const contacts = contactsData?.items || [];
    const jobs = jobsData?.items || [];

    useEffect(() => {
        if (!open) {
            setReference("");
            setCompanyId("");
            setContactId("");
            setJobId("");
            setIssueDate("");
            setDueDate("");
            setNotes("");
            setGstInclusive(true);
            setLineItems([{ description: "", quantity: 1, unit_price: 0, account_code: "" }]);
        }
    }, [open]);

    const addLineItem = () => {
        setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, account_code: "" }]);
    };

    const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
        setLineItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length === 1) return;
        setLineItems(items => items.filter((_, i) => i !== index));
    };

    const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

    const handleSubmit = async () => {
        const validItems = lineItems.filter(li => li.description.trim());
        if (validItems.length === 0) {
            toast.error("Add at least one line item");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference: reference || null,
                    company_id: companyId || null,
                    contact_id: contactId || null,
                    job_id: jobId || null,
                    issue_date: issueDate || null,
                    due_date: dueDate || null,
                    notes: notes || null,
                    gst_inclusive: gstInclusive,
                    status: "draft",
                    type: "ACCREC",
                    line_items: validItems,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create invoice");
            }

            const data = await res.json();
            toast.success("Invoice created");
            onOpenChange(false);
            onCreated?.(data.item);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create invoice");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Invoice</DialogTitle>
                    <DialogDescription>Create a new sales invoice.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Reference</label>
                            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-001" className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Company</label>
                            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-base">
                                <option value="">Select company...</option>
                                {companies.map((c: { id: string; name: string }) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Contact</label>
                            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-base">
                                <option value="">Select contact...</option>
                                {contacts.map((c: { id: string; first_name: string; last_name: string }) => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Job</label>
                            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-base">
                                <option value="">Select job...</option>
                                {jobs.map((j: { id: string; description: string }) => (
                                    <option key={j.id} value={j.id}>{j.description}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Issue Date</label>
                            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Due Date</label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={gstInclusive} onChange={(e) => setGstInclusive(e.target.checked)} className="rounded" />
                                GST Inclusive
                            </label>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Line Items</label>
                        <div className="space-y-2">
                            {lineItems.map((li, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <Input
                                        placeholder="Description"
                                        value={li.description}
                                        onChange={(e) => updateLineItem(i, "description", e.target.value)}
                                        className="rounded-xl flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={li.quantity || ""}
                                        onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                                        className="rounded-xl w-20"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Price"
                                        value={li.unit_price || ""}
                                        onChange={(e) => updateLineItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                                        className="rounded-xl w-28"
                                    />
                                    <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => removeLineItem(i)} disabled={lineItems.length === 1}>
                                        &times;
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={addLineItem}>
                            + Add Line
                        </Button>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full min-h-[60px] px-3 py-2 rounded-xl border border-input bg-background text-base resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                        <h3 className="text-lg font-bold">
                            Total: {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(total)}
                        </h3>
                        <div className="flex gap-2">
                            <Button variant="outline" className="" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button className="" onClick={handleSubmit} disabled={saving}>
                                {saving ? "Creating..." : "Create Invoice"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
