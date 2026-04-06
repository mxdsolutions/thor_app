"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { createClient } from "@/lib/supabase/client";
import { useProfiles, useStatusConfig, useJobQuotes, useJobInvoices, useJobReports } from "@/lib/swr";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { DEFAULT_JOB_STATUSES, toStatusConfig, PAID_STATUS_CONFIG } from "@/lib/status-config";
import { toast } from "sonner";

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
    lead?: { id: string; title: string } | null;
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

type Service = {
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

// Status config is loaded dynamically from tenant config

const paidStatusConfig = PAID_STATUS_CONFIG;

/** Side sheet for viewing/editing job details, assignees, line items, and payment status. */
export function JobSideSheet({ job, open, onOpenChange, onUpdate }: JobSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Job | null>(job);
    const [jobProjects, setJobProjects] = useState<{ id: string; title: string; status: string }[]>([]);
    const [leads, setLeads] = useState<{ value: string; label: string }[]>([]);
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const { data: statusData } = useStatusConfig("job");
    const statusConfig = toStatusConfig(statusData?.statuses ?? DEFAULT_JOB_STATUSES);
    const { data: quotesData } = useJobQuotes(activeTab === "quotes" ? job?.id ?? null : null);
    const { data: invoicesData } = useJobInvoices(activeTab === "invoices" ? job?.id ?? null : null);
    const { data: reportsData } = useJobReports(activeTab === "reports" ? job?.id ?? null : null);
    const router = useRouter();
    const { data: profilesData } = useProfiles();
    const users: { value: string; label: string }[] = useMemo(() =>
        (profilesData?.users || []).map((u: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
            value: u.id,
            label: u.user_metadata?.full_name || u.email || u.id,
        })),
        [profilesData]
    );

    useEffect(() => { setData(job); }, [job]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("leads").select("id, title").then(({ data: lds }) => {
            if (lds) setLeads(lds.map((o) => ({ value: o.id, label: o.title })));
        });
        supabase.from("companies").select("id, name").then(({ data: comps }) => {
            if (comps) setCompanies(comps.map((c) => ({ value: c.id, label: c.name })));
        });
        supabase.from("products").select("id, name, initial_value").eq("status", "active").then(({ data: prods }) => {
            if (prods) setServices(prods);
        });
    }, []);

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

    const handleAddLineItem = async (productId: string, quantity: number, unitPrice: number) => {
        if (!data) return;
        const res = await fetch("/api/job-line-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: data.id, product_id: productId, quantity, unit_price: unitPrice }),
        });
        if (res.ok) {
            const { lineItem, jobAmount } = await res.json();
            setLineItems((prev) => [...prev, lineItem]);
            setData((prev) => prev ? { ...prev, amount: jobAmount } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to add service");
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
            toast.error("Failed to remove service");
        }
    };

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.new;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "services", label: `Services (${lineItems.length})` },
        { id: "scopes", label: `Scopes (${jobProjects.length})` },
        { id: "quotes", label: `Quotes${quotesData?.items?.length ? ` (${quotesData.items.length})` : ""}` },
        { id: "invoices", label: `Invoices${invoicesData?.items?.length ? ` (${invoicesData.items.length})` : ""}` },
        { id: "reports", label: `Reports${reportsData?.items?.length ? ` (${reportsData.items.length})` : ""}` },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<span className="text-lg font-bold text-blue-600">J</span>}
            iconBg="bg-blue-500/10"
            title={data.description}
            subtitle={`$${data.amount.toLocaleString()}${data.scheduled_date ? ` · ${new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" })}` : ""}`}
            badge={{ label: status.label, dotColor: status.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            <div className="px-4 pb-2">
                <button
                    onClick={() => { onOpenChange(false); router.push(`${ROUTES.OPS_JOB_DETAIL}/${data.id}`); }}
                    className="text-xs text-primary hover:underline"
                >
                    Open full job view →
                </button>
            </div>

            {activeTab === "details" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "Description", value: data.description, dbColumn: "description", type: "text", rawValue: data.description },
                                { label: "Status", value: status.label, dbColumn: "status", type: "select", rawValue: data.status, options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                                { label: "Scheduled Date", value: data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" }) : null, dbColumn: "scheduled_date", type: "date", rawValue: data.scheduled_date },
                                { label: "Paid Status", value: paidStatusConfig[data.paid_status]?.label || "Not Paid", dbColumn: "paid_status", type: "select", rawValue: data.paid_status, options: Object.entries(paidStatusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                                { label: "Payment Received", value: `$${(data.total_payment_received || 0).toLocaleString()}`, dbColumn: "total_payment_received", type: "number", rawValue: data.total_payment_received || 0 },
                                { label: "Lead", value: data.lead?.title, dbColumn: "lead_id", type: "select", rawValue: data.lead?.id ?? null, options: leads },
                                { label: "Company", value: data.company?.name, dbColumn: "company_id", type: "select", rawValue: data.company?.id ?? null, options: companies },
                                { label: "Created", value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }) },
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

            {activeTab === "services" && (
                <div className="space-y-4">
                    <LineItemsTable
                        mode="live"
                        items={lineItems}
                        services={services}
                        onAdd={handleAddLineItem}
                        onUpdate={handleUpdateLineItem}
                        onDelete={handleDeleteLineItem}
                    />
                </div>
            )}

            {activeTab === "scopes" && (
                <div className="space-y-3">
                    {jobProjects.length === 0 ? (
                        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            No scopes linked to this job
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

            {activeTab === "quotes" && (
                <div className="space-y-2 px-1">
                    {(quotesData?.items || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No quotes yet</p>
                    ) : (quotesData?.items || []).map((q: any) => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm">
                            <div>
                                <p className="font-medium">{q.title || "Untitled Quote"}</p>
                                <p className="text-xs text-muted-foreground capitalize">{q.status}</p>
                            </div>
                            <span className="font-semibold">${(q.total_amount || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "invoices" && (
                <div className="space-y-2 px-1">
                    {(invoicesData?.items || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
                    ) : (invoicesData?.items || []).map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm">
                            <div>
                                <p className="font-medium">{inv.invoice_number || "Untitled Invoice"}</p>
                                <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                            </div>
                            <span className="font-semibold">${(inv.amount || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "reports" && (
                <div className="space-y-2 px-1">
                    {(reportsData?.items || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No reports yet</p>
                    ) : (reportsData?.items || []).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm">
                            <div>
                                <p className="font-medium">{r.title || "Untitled Report"}</p>
                                <p className="text-xs text-muted-foreground capitalize">{r.type?.replace(/_/g, " ") || "Report"} · {r.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="job" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="job" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
