"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

type Assignee = { id: string; full_name: string | null; email: string | null };

type Job = {
    id: string;
    description: string;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    scheduled_date: string | null;
    project?: { id: string; title: string } | null;
    assignees: Assignee[];
    opportunity?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    created_at: string;
};

type LineItem = {
    id: string;
    job_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product: { id: string; name: string } | null;
    created_at: string;
};

type Product = {
    id: string;
    name: string;
    initial_value: number | null;
};

interface JobSideSheetProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: "New", color: "bg-amber-500" },
    in_progress: { label: "In Progress", color: "bg-blue-500" },
    completed: { label: "Completed", color: "bg-emerald-500" },
    cancelled: { label: "Cancelled", color: "bg-rose-400" },
};

const paidStatusConfig: Record<string, { label: string; color: string }> = {
    not_paid: { label: "Not Paid", color: "text-rose-500" },
    partly_paid: { label: "Partly Paid", color: "text-amber-500" },
    paid_in_full: { label: "Paid in Full", color: "text-emerald-500" },
};

export function JobSideSheet({ job, open, onOpenChange, onUpdate }: JobSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Job | null>(job);
    const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
    const [jobProjects, setJobProjects] = useState<{ id: string; title: string; status: string }[]>([]);
    const [opportunities, setOpportunities] = useState<{ value: string; label: string }[]>([]);
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [addingProduct, setAddingProduct] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [newQty, setNewQty] = useState(1);
    const [newUnitPrice, setNewUnitPrice] = useState(0);

    useEffect(() => {
        setData(job);
    }, [job]);

    useEffect(() => {
        if (data?.id) setActiveTab("details");
    }, [data?.id]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("profiles").select("id, full_name, email").then(({ data: profiles }) => {
            if (profiles) setUsers(profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || p.id })));
        });
        supabase.from("opportunities").select("id, title").then(({ data: opps }) => {
            if (opps) setOpportunities(opps.map((o) => ({ value: o.id, label: o.title })));
        });
        supabase.from("companies").select("id, name").then(({ data: comps }) => {
            if (comps) setCompanies(comps.map((c) => ({ value: c.id, label: c.name })));
        });
        supabase.from("products").select("id, name, initial_value").eq("status", "active").then(({ data: prods }) => {
            if (prods) setProducts(prods);
        });
    }, []);

    // Fetch line items when job changes
    const fetchLineItems = useCallback(async (jobId: string) => {
        const res = await fetch(`/api/job-line-items?job_id=${jobId}`);
        if (res.ok) {
            const { lineItems: items } = await res.json();
            setLineItems(items || []);
        }
    }, []);

    const fetchJobProjects = useCallback(async (jobId: string) => {
        const supabase = createClient();
        const { data: projs } = await supabase
            .from("projects")
            .select("id, title, status")
            .eq("job_id", jobId)
            .order("created_at", { ascending: true });
        setJobProjects(projs || []);
    }, []);

    useEffect(() => {
        if (data?.id) {
            fetchLineItems(data.id);
            fetchJobProjects(data.id);
        }
    }, [data?.id, fetchLineItems, fetchJobProjects]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("jobs")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const handleAddLineItem = async () => {
        if (!data || !selectedProductId) return;
        const res = await fetch("/api/job-line-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                job_id: data.id,
                product_id: selectedProductId,
                quantity: newQty,
                unit_price: newUnitPrice,
            }),
        });
        if (res.ok) {
            const { lineItem, jobAmount } = await res.json();
            setLineItems((prev) => [...prev, lineItem]);
            setData((prev) => prev ? { ...prev, amount: jobAmount } : prev);
            setAddingProduct(false);
            setSelectedProductId("");
            setNewQty(1);
            setNewUnitPrice(0);
            onUpdate?.();
        } else {
            toast.error("Failed to add product");
        }
    };

    const handleUpdateLineItem = async (id: string, field: "quantity" | "unit_price", value: number) => {
        const res = await fetch("/api/job-line-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, [field]: value }),
        });
        if (res.ok) {
            const { lineItem, jobAmount } = await res.json();
            setLineItems((prev) => prev.map((li) => li.id === id ? lineItem : li));
            setData((prev) => prev ? { ...prev, amount: jobAmount } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update");
        }
    };

    const handleDeleteLineItem = async (id: string) => {
        const res = await fetch(`/api/job-line-items?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            const { jobAmount } = await res.json();
            setLineItems((prev) => prev.filter((li) => li.id !== id));
            setData((prev) => prev ? { ...prev, amount: jobAmount } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to remove product");
        }
    };

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.new;
    const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

    const tabs = [
        { id: "details", label: "Details" },
        { id: "products", label: `Products (${lineItems.length})` },
        { id: "projects", label: `Projects (${jobProjects.length})` },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-lg font-bold text-blue-600">J</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-lg font-bold truncate">{data.description}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status.color)} />
                                    {status.label}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                ${data.amount.toLocaleString()}
                                {data.scheduled_date && ` · ${new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" })}`}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "details" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields
                                        onSave={handleSave}
                                        fields={[
                                            {
                                                label: "Description",
                                                value: data.description,
                                                dbColumn: "description",
                                                type: "text",
                                                rawValue: data.description,
                                            },
                                            {
                                                label: "Status",
                                                value: status.label,
                                                dbColumn: "status",
                                                type: "select",
                                                rawValue: data.status,
                                                options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
                                            },
                                            {
                                                label: "Scheduled Date",
                                                value: data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" }) : null,
                                                dbColumn: "scheduled_date",
                                                type: "date",
                                                rawValue: data.scheduled_date,
                                            },
                                            {
                                                label: "Paid Status",
                                                value: paidStatusConfig[data.paid_status]?.label || "Not Paid",
                                                dbColumn: "paid_status",
                                                type: "select",
                                                rawValue: data.paid_status,
                                                options: Object.entries(paidStatusConfig).map(([k, v]) => ({ value: k, label: v.label })),
                                            },
                                            {
                                                label: "Payment Received",
                                                value: `$${(data.total_payment_received || 0).toLocaleString()}`,
                                                dbColumn: "total_payment_received",
                                                type: "number",
                                                rawValue: data.total_payment_received || 0,
                                            },
                                            {
                                                label: "Opportunity",
                                                value: data.opportunity?.title,
                                                dbColumn: "opportunity_id",
                                                type: "select",
                                                rawValue: data.opportunity?.id ?? null,
                                                options: opportunities,
                                            },
                                            {
                                                label: "Company",
                                                value: data.company?.name,
                                                dbColumn: "company_id",
                                                type: "select",
                                                rawValue: data.company?.id ?? null,
                                                options: companies,
                                            },
                                            {
                                                label: "Created",
                                                value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }),
                                            },
                                        ]}
                                    />
                                </div>

                                {/* Assignees */}
                                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignees</p>
                                    <div className="space-y-2">
                                        {(data.assignees || []).map((a) => (
                                            <div key={a.id} className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                                        {(a.full_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium">{a.full_name || a.email}</span>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const newIds = (data.assignees || []).filter(x => x.id !== a.id).map(x => x.id);
                                                        const res = await fetch("/api/jobs", {
                                                            method: "PATCH",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ id: data.id, assignee_ids: newIds }),
                                                        });
                                                        if (res.ok) {
                                                            setData(prev => prev ? { ...prev, assignees: prev.assignees.filter(x => x.id !== a.id) } : prev);
                                                            onUpdate?.();
                                                        }
                                                    }}
                                                    className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <select
                                        className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        value=""
                                        onChange={async (e) => {
                                            const userId = e.target.value;
                                            if (!userId) return;
                                            const existing = (data.assignees || []).map(a => a.id);
                                            if (existing.includes(userId)) return;
                                            const newIds = [...existing, userId];
                                            const res = await fetch("/api/jobs", {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ id: data.id, assignee_ids: newIds }),
                                            });
                                            if (res.ok) {
                                                const user = users.find(u => u.value === userId);
                                                setData(prev => prev ? {
                                                    ...prev,
                                                    assignees: [...prev.assignees, { id: userId, full_name: user?.label || null, email: null }],
                                                } : prev);
                                                onUpdate?.();
                                            }
                                        }}
                                    >
                                        <option value="">Add assignee...</option>
                                        {users.filter(u => !(data.assignees || []).some(a => a.id === u.value)).map(u => (
                                            <option key={u.value} value={u.value}>{u.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTab === "products" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-secondary/30">
                                                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Qty</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Unit Price</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Total</th>
                                                <th className="w-10" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineItems.length === 0 && !addingProduct && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                        No products added yet
                                                    </td>
                                                </tr>
                                            )}
                                            {lineItems.map((li) => (
                                                <tr key={li.id} className="border-b border-border/50 last:border-0">
                                                    <td className="px-4 py-3 font-medium">{li.product?.name || "Unknown"}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <InlineNumberInput
                                                            value={li.quantity}
                                                            onSave={(v) => handleUpdateLineItem(li.id, "quantity", v)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <InlineNumberInput
                                                            value={li.unit_price}
                                                            onSave={(v) => handleUpdateLineItem(li.id, "unit_price", v)}
                                                            prefix="$"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                        ${(li.quantity * li.unit_price).toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <button
                                                            onClick={() => handleDeleteLineItem(li.id)}
                                                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {addingProduct && (
                                                <tr className="border-b border-border/50">
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={newQty}
                                                            onChange={(e) => setNewQty(Number(e.target.value))}
                                                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            value={newUnitPrice}
                                                            onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                                                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium tabular-nums text-muted-foreground">
                                                        ${(newQty * newUnitPrice).toLocaleString()}
                                                    </td>
                                                    <td />
                                                </tr>
                                            )}
                                        </tbody>
                                        {(lineItems.length > 0 || addingProduct) && (
                                            <tfoot>
                                                <tr className="border-t border-border bg-secondary/20">
                                                    <td colSpan={3} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</td>
                                                    <td className="px-4 py-3 text-right font-bold tabular-nums">${lineItemsTotal.toLocaleString()}</td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {addingProduct ? (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="rounded-full"
                                            disabled={!selectedProductId}
                                            onClick={handleAddLineItem}
                                        >
                                            Add
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() => { setAddingProduct(false); setSelectedProductId(""); setNewQty(1); setNewUnitPrice(0); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setAddingProduct(true)}
                                    >
                                        <PlusIcon className="w-4 h-4 mr-1.5" />
                                        Add Product
                                    </Button>
                                )}
                            </div>
                        )}

                        {activeTab === "projects" && (
                            <div className="space-y-3">
                                {jobProjects.length === 0 ? (
                                    <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                                        No projects linked to this job
                                    </div>
                                ) : (
                                    jobProjects.map((proj) => (
                                        <div key={proj.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {proj.title.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{proj.title}</p>
                                                    <p className="text-[11px] text-muted-foreground capitalize">{proj.status.replace(/_/g, " ")}</p>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                proj.status === "completed" ? "bg-emerald-500" :
                                                proj.status === "in_progress" ? "bg-blue-500" :
                                                proj.status === "cancelled" ? "bg-rose-400" : "bg-amber-500"
                                            )} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="job" entityId={data.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="job" entityId={data.id} />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function InlineNumberInput({ value, onSave, prefix }: { value: number; onSave: (v: number) => void; prefix?: string }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));

    if (editing) {
        return (
            <input
                type="number"
                min={0}
                step={prefix ? 0.01 : 1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                    setEditing(false);
                    const parsed = Number(draft);
                    if (!isNaN(parsed) && parsed !== value) onSave(parsed);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setEditing(false); setDraft(String(value)); }
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-sm tabular-nums hover:underline cursor-pointer text-right w-full"
        >
            {prefix}{value.toLocaleString()}
        </button>
    );
}
