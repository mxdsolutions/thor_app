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
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

type LineItemDraft = {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
};

interface CreateJobFromOpportunityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    opportunityId: string;
    opportunityTitle: string;
    companyId: string | null;
    companyName: string | null;
    onCreated?: (job: any) => void;
}

export function CreateJobFromOpportunityModal({
    open,
    onOpenChange,
    opportunityId,
    opportunityTitle,
    companyId,
    companyName,
    onCreated,
}: CreateJobFromOpportunityModalProps) {
    const [description, setDescription] = useState("");
    const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
    const [assignedTo, setAssignedTo] = useState("");
    const [products, setProducts] = useState<{ id: string; name: string; initial_value: number | null }[]>([]);
    const [addingProduct, setAddingProduct] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [newQty, setNewQty] = useState(1);
    const [newUnitPrice, setNewUnitPrice] = useState(0);

    // Fetch opportunity line items and users when opened
    useEffect(() => {
        if (!open || !opportunityId) return;

        setDescription(opportunityTitle);
        setLoading(true);

        Promise.all([
            fetch(`/api/opportunity-line-items?opportunity_id=${opportunityId}`).then((r) => r.json()),
            fetch("/api/users").then((r) => r.json()),
            fetch("/api/products").then((r) => r.json()),
        ])
            .then(([liData, userData, prodData]) => {
                const items = (liData.lineItems || []).map((li: any) => ({
                    id: li.id,
                    product_id: li.product_id,
                    product_name: li.product?.name || "Unknown",
                    quantity: li.quantity,
                    unit_price: li.unit_price,
                }));
                setLineItems(items);
                setUsers(userData.users || []);
                setProducts((prodData.products || []).filter((p: any) => p.status === "active"));
            })
            .catch(() => toast.error("Failed to load data"))
            .finally(() => setLoading(false));
    }, [open, opportunityId, opportunityTitle]);

    const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

    const updateLineItem = (id: string, field: "quantity" | "unit_price", value: number) => {
        setLineItems((prev) =>
            prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
        );
    };

    const removeLineItem = (id: string) => {
        setLineItems((prev) => prev.filter((li) => li.id !== id));
    };

    const addLineItem = () => {
        if (!selectedProductId) return;
        const prod = products.find((p) => p.id === selectedProductId);
        if (!prod) return;
        setLineItems((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}`,
                product_id: prod.id,
                product_name: prod.name,
                quantity: newQty,
                unit_price: newUnitPrice,
            },
        ]);
        setAddingProduct(false);
        setSelectedProductId("");
        setNewQty(1);
        setNewUnitPrice(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setSaving(true);
        try {
            const res = await fetch("/api/jobs/from-opportunity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    opportunity_id: opportunityId,
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
            toast.success("Job created from opportunity");
            onCreated?.(data.job);
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
                    <DialogTitle>Create Job from Opportunity</DialogTitle>
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
                                <Input
                                    value={companyName || "—"}
                                    disabled
                                    className="rounded-xl bg-muted"
                                />
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

                        {/* Line items */}
                        <div className="space-y-1.5 min-h-0 flex flex-col">
                            <label className="text-xs font-medium text-muted-foreground">
                                Line Items {lineItems.length > 0 && `(${lineItems.length})`}
                            </label>
                            <div className="rounded-xl border border-border bg-card overflow-hidden flex-1 min-h-0 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-secondary/30">
                                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Qty</th>
                                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Price</th>
                                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Total</th>
                                            <th className="w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.length === 0 && !addingProduct ? (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">
                                                    No line items yet
                                                </td>
                                            </tr>
                                        ) : (
                                            lineItems.map((li) => (
                                                <tr key={li.id} className="border-b border-border/50 last:border-0">
                                                    <td className="px-3 py-2 font-medium text-sm">{li.product_name}</td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={li.quantity}
                                                            onChange={(e) => updateLineItem(li.id, "quantity", Number(e.target.value))}
                                                            className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            value={li.unit_price}
                                                            onChange={(e) => updateLineItem(li.id, "unit_price", Number(e.target.value))}
                                                            className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium tabular-nums text-sm">
                                                        ${(li.quantity * li.unit_price).toLocaleString()}
                                                    </td>
                                                    <td className="px-1 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLineItem(li.id)}
                                                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        {addingProduct && (
                                            <tr className="border-b border-border/50">
                                                <td className="px-3 py-2">
                                                    <select
                                                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                        value={selectedProductId}
                                                        onChange={(e) => {
                                                            setSelectedProductId(e.target.value);
                                                            const prod = products.find((p) => p.id === e.target.value);
                                                            if (prod?.initial_value) setNewUnitPrice(prod.initial_value);
                                                        }}
                                                        autoFocus
                                                    >
                                                        <option value="">Select product...</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={newQty}
                                                        onChange={(e) => setNewQty(Number(e.target.value))}
                                                        className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={newUnitPrice}
                                                        onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                                                        className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums text-sm text-muted-foreground">
                                                    ${(newQty * newUnitPrice).toLocaleString()}
                                                </td>
                                                <td className="px-1 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAddingProduct(false); setSelectedProductId(""); setNewQty(1); setNewUnitPrice(0); }}
                                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {(lineItems.length > 0 || addingProduct) && (
                                        <tfoot>
                                            <tr className="border-t border-border bg-secondary/20">
                                                <td colSpan={3} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</td>
                                                <td className="px-3 py-2 text-right font-bold tabular-nums">${total.toLocaleString()}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            {addingProduct ? (
                                <div className="flex gap-2 mt-2">
                                    <Button type="button" size="sm" className="rounded-full" disabled={!selectedProductId} onClick={addLineItem}>
                                        Add
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => { setAddingProduct(false); setSelectedProductId(""); setNewQty(1); setNewUnitPrice(0); }}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button type="button" variant="outline" size="sm" className="rounded-full mt-2" onClick={() => setAddingProduct(true)}>
                                    <PlusIcon className="w-4 h-4 mr-1.5" />
                                    Add Product
                                </Button>
                            )}
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
