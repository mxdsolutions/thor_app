"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getJobStatusDot, sheetTitleClass, avatarSurfaceClass } from "@/lib/design-system";
import { DetailFields } from "@/components/sheets/DetailFields";
import { NotesPanel } from "@/components/sheets/NotesPanel";
import { ActivityTimeline } from "@/components/sheets/ActivityTimeline";
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { createClient } from "@/lib/supabase/client";
import { useProfiles, useStatusConfig, useJobQuotes, useJobInvoices, useJobReports } from "@/lib/swr";
import { DEFAULT_JOB_STATUSES, toStatusConfig, PAID_STATUS_CONFIG } from "@/lib/status-config";
import { toast } from "sonner";
import { IconPlus as PlusIcon, IconArrowLeft as ArrowLeftIcon, IconX as XMarkIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { JobTasksPanel } from "@/components/jobs/JobTasksPanel";
import { CreateQuoteModal } from "@/components/modals/CreateQuoteModal";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { CreateReportModal } from "@/components/modals/CreateReportModal";
import { QuoteSideSheet } from "@/components/sheets/QuoteSideSheet";
import { InvoiceSideSheet } from "@/components/sheets/InvoiceSideSheet";
import { ReportSideSheet } from "@/components/sheets/ReportSideSheet";
import { mutate } from "swr";

type Assignee = { id: string; full_name: string | null; email: string | null };

type QuoteItem = { id: string; title: string | null; status: string; total_amount: number;[key: string]: unknown };
type InvoiceItem = { id: string; invoice_number: string | null; status: string; amount: number; total: number;[key: string]: unknown };
type ReportItem = { id: string; title: string | null; type: string | null; status: string;[key: string]: unknown };

export type JobDetailJob = {
    id: string;
    job_title: string;
    description: string | null;
    reference_id: string | null;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    scheduled_date: string | null;
    project?: { id: string; title: string } | null;
    assignees: Assignee[];
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    service?: { id: string; name: string } | null;
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

interface JobDetailViewProps {
    job: JobDetailJob;
    mode: "inline" | "sheet";
    onUpdate?: () => void;
    onClose?: () => void;
}

const paidStatusConfig = PAID_STATUS_CONFIG;

/** Shared job detail view used by both the inline jobs page and the JobSideSheet. */
export function JobDetailView({ job, mode, onUpdate, onClose }: JobDetailViewProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<JobDetailJob>(job);
    const [jobProjects, setJobProjects] = useState<{ id: string; title: string; status: string }[]>([]);
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [quoteModalOpen, setQuoteModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const { data: statusData } = useStatusConfig("job");
    const statusConfig = toStatusConfig(statusData?.statuses ?? DEFAULT_JOB_STATUSES);
    const { data: quotesData } = useJobQuotes(activeTab === "quotes" ? data.id : null);
    const { data: invoicesData } = useJobInvoices(activeTab === "invoices" ? data.id : null);
    const { data: reportsData } = useJobReports(activeTab === "reports" ? data.id : null);
    const { data: profilesData } = useProfiles();
    const users: { value: string; label: string }[] = useMemo(() =>
        (profilesData?.users || []).map((u: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
            value: u.id,
            label: u.user_metadata?.full_name || u.email || u.id,
        })),
        [profilesData]
    );

    useEffect(() => { setData(job); }, [job]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("companies").select("id, name").then(({ data: comps }) => {
            if (comps) setCompanies(comps.map((c) => ({ value: c.id, label: c.name })));
        });
        supabase.from("contacts").select("id, first_name, last_name").then(({ data: conts }) => {
            if (conts) setContacts(conts);
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
        if (data.id) {
            fetchLineItems(data.id);
            fetchJobProjects(data.id);
        }
    }, [data.id, fetchLineItems, fetchJobProjects]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        const supabase = createClient();
        const { error } = await supabase
            .from("jobs")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => ({ ...prev, [column]: value }));
            onUpdate?.();
        }
    }, [data.id, onUpdate]);

    const handleAddLineItem = async (productId: string, quantity: number, unitPrice: number) => {
        const res = await fetch("/api/job-line-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: data.id, product_id: productId, quantity, unit_price: unitPrice }),
        });
        if (res.ok) {
            const { lineItem, jobAmount } = await res.json();
            setLineItems((prev) => [...prev, lineItem]);
            setData((prev) => ({ ...prev, amount: jobAmount }));
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
            setData((prev) => ({ ...prev, amount: jobAmount }));
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
            setData((prev) => ({ ...prev, amount: jobAmount }));
            onUpdate?.();
        } else {
            toast.error("Failed to remove service");
        }
    };

    const status = statusConfig[data.status] || statusConfig.new;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "scopes", label: `Scopes (${jobProjects.length})` },
        { id: "quotes", label: `Quotes${quotesData?.items?.length ? ` (${quotesData.items.length})` : ""}` },
        { id: "reports", label: `Reports${reportsData?.items?.length ? ` (${reportsData.items.length})` : ""}` },
        { id: "invoices", label: `Invoices${invoicesData?.items?.length ? ` (${invoicesData.items.length})` : ""}` },
        { id: "services", label: `Services (${lineItems.length})` },
        // Sheet mode shows Tasks as a tab; inline mode shows Tasks in a right rail instead.
        ...(mode === "sheet" ? [{ id: "tasks", label: "Tasks" }] : []),
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const subtitle = `$${data.amount.toLocaleString()}${data.scheduled_date ? ` · ${new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" })}` : ""}`;

    return (
        <div className="flex flex-col h-full min-h-0 bg-background">
            {/* Back link (inline mode only) */}
            {mode === "inline" && onClose && (
                <div className="px-6 pt-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back to All Jobs
                    </button>
                </div>
            )}

            {/* Header */}
            <div className={cn("px-6 pb-4 border-b border-border shrink-0", mode === "inline" ? "pt-3" : "pt-6")}>
                <div className="flex items-start gap-4">
                    <div className={cn("w-[60px] h-[60px] rounded-xl flex items-center justify-center shrink-0", avatarSurfaceClass)}>
                        <span className="text-lg font-bold uppercase tracking-wide">J</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className={sheetTitleClass}>{data.job_title}</h1>
                            {data.reference_id && (
                                <span className="text-xs font-mono text-muted-foreground">{data.reference_id}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-[2px]">
                            <span className="inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider bg-secondary text-foreground">
                                <span className={cn("w-2 h-2 rounded-full mr-2", status.color)} />
                                {status.label}
                            </span>
                            <span className="text-sm text-muted-foreground">· {subtitle}</span>
                        </div>
                    </div>
                    {mode === "sheet" && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center shrink-0 transition-colors"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-border/50 bg-background shrink-0">
                <div className="flex gap-6 -mb-px pt-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "pb-3 text-[17px] font-medium transition-colors relative focus:outline-none whitespace-nowrap",
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

            {/* Content + optional right rail for inline mode */}
            <div className="flex-1 flex min-h-0 bg-secondary/20">
            <div className="flex-1 overflow-y-auto p-6 min-w-0">
                {activeTab === "details" && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <DetailFields
                                onSave={handleSave}
                                fields={[
                                    { label: "Job ID", value: data.reference_id, dbColumn: "reference_id", type: "text", rawValue: data.reference_id },
                                    { label: "Job Name", value: data.job_title, dbColumn: "job_title", type: "text", rawValue: data.job_title },
                                    { label: "Description", value: data.description, dbColumn: "description", type: "text", rawValue: data.description },
                                    { label: "Type", value: data.service?.name, dbColumn: "service_id", type: "select", rawValue: data.service?.id ?? null, options: services.map((s) => ({ value: s.id, label: s.name })) },
                                    { label: "Customer", value: data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : null, dbColumn: "contact_id", type: "select", rawValue: data.contact?.id ?? null, options: contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` })) },
                                    { label: "Company", value: data.company?.name, dbColumn: "company_id", type: "select", rawValue: data.company?.id ?? null, options: companies },
                                    { label: "Status", value: status.label, dbColumn: "status", type: "select", rawValue: data.status, options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                                    { label: "Scheduled Date", value: data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" }) : null, dbColumn: "scheduled_date", type: "date", rawValue: data.scheduled_date },
                                    { label: "Paid Status", value: paidStatusConfig[data.paid_status]?.label || "Not Paid", dbColumn: "paid_status", type: "select", rawValue: data.paid_status, options: Object.entries(paidStatusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                                    { label: "Payment Received", value: `$${(data.total_payment_received || 0).toLocaleString()}`, dbColumn: "total_payment_received", type: "number", rawValue: data.total_payment_received || 0 },
                                    { label: "Amount", value: `$${(data.amount || 0).toLocaleString()}` },
                                    { label: "Created", value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }) },
                                ]}
                            />
                        </div>

                        {/* Assignees */}
                        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignees</p>
                            <div className="space-y-2">
                                {(data.assignees || []).map((a, idx) => (
                                    <div key={a.id ?? idx} className="flex items-center justify-between gap-3">
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
                                                    setData(prev => ({ ...prev, assignees: prev.assignees.filter(x => x.id !== a.id) }));
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
                                        setData(prev => ({
                                            ...prev,
                                            assignees: [...prev.assignees, { id: userId, full_name: user?.label || null, email: null }],
                                        }));
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
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-semibold text-foreground">Scopes</p>
                            <Button size="sm" disabled>
                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                New Scope
                            </Button>
                        </div>
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
                                    <div className={cn("w-2 h-2 rounded-full", getJobStatusDot(proj.status))} />
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "quotes" && (
                    <div className="space-y-2 px-1">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-semibold text-foreground">Quotes</p>
                            <Button size="sm" onClick={() => setQuoteModalOpen(true)}>
                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                New Quote
                            </Button>
                        </div>
                        {(quotesData?.items || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No quotes yet</p>
                        ) : (quotesData?.items || []).map((q: QuoteItem) => (
                            <div key={q.id} onClick={() => setSelectedQuote(q)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                                <div>
                                    <p className="font-medium">{q.title || "Untitled Quote"}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{q.status}</p>
                                </div>
                                <span className="font-semibold">${(q.total_amount || 0).toFixed(2)}</span>
                            </div>
                        ))}
                        <CreateQuoteModal
                            open={quoteModalOpen}
                            onOpenChange={setQuoteModalOpen}
                            defaultValues={{ jobId: data.id, companyId: data.company?.id }}
                            onCreated={() => mutate(`/api/quotes?job_id=${data.id}`)}
                        />
                        <QuoteSideSheet
                            quote={selectedQuote}
                            open={!!selectedQuote}
                            onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}
                            onUpdate={() => mutate(`/api/quotes?job_id=${data.id}`)}
                        />
                    </div>
                )}

                {activeTab === "invoices" && (
                    <div className="space-y-2 px-1">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-semibold text-foreground">Invoices</p>
                            <Button size="sm" onClick={() => setInvoiceModalOpen(true)}>
                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                New Invoice
                            </Button>
                        </div>
                        {(invoicesData?.items || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
                        ) : (invoicesData?.items || []).map((inv: InvoiceItem) => (
                            <div key={inv.id} onClick={() => setSelectedInvoice(inv)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                                <div>
                                    <p className="font-medium">{inv.invoice_number || "Untitled Invoice"}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                                </div>
                                <span className="font-semibold">${(inv.amount || 0).toFixed(2)}</span>
                            </div>
                        ))}
                        <CreateInvoiceModal
                            open={invoiceModalOpen}
                            onOpenChange={setInvoiceModalOpen}
                            defaultValues={{ job_id: data.id, company_id: data.company?.id }}
                            onCreated={() => mutate(`/api/invoices?job_id=${data.id}`)}
                        />
                        <InvoiceSideSheet
                            invoice={selectedInvoice}
                            open={!!selectedInvoice}
                            onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
                            onUpdate={() => mutate(`/api/invoices?job_id=${data.id}`)}
                        />
                    </div>
                )}

                {activeTab === "reports" && (
                    <div className="space-y-2 px-1">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-semibold text-foreground">Reports</p>
                            <Button size="sm" onClick={() => setReportModalOpen(true)}>
                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                New Report
                            </Button>
                        </div>
                        {(reportsData?.items || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No reports yet</p>
                        ) : (reportsData?.items || []).map((r: ReportItem) => (
                            <div key={r.id} onClick={() => setSelectedReport(r)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                                <div>
                                    <p className="font-medium">{r.title || "Untitled Report"}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{r.type?.replace(/_/g, " ") || "Report"} · {r.status}</p>
                                </div>
                            </div>
                        ))}
                        <CreateReportModal
                            open={reportModalOpen}
                            onOpenChange={setReportModalOpen}
                            defaultValues={{ job_id: data.id, company_id: data.company?.id }}
                            onCreated={() => mutate(`/api/reports?job_id=${data.id}`)}
                        />
                        <ReportSideSheet
                            report={selectedReport}
                            open={!!selectedReport}
                            onOpenChange={(open) => { if (!open) setSelectedReport(null); }}
                            onUpdate={() => mutate(`/api/reports?job_id=${data.id}`)}
                        />
                    </div>
                )}

                {activeTab === "tasks" && mode === "sheet" && (
                    <JobTasksPanel jobId={data.id} variant="tab" />
                )}

                {activeTab === "notes" && (
                    <NotesPanel entityType="job" entityId={data.id} />
                )}

                {activeTab === "activity" && (
                    <ActivityTimeline entityType="job" entityId={data.id} />
                )}
            </div>
            {mode === "inline" && (
                <aside className="hidden lg:flex w-[420px] xl:w-[460px] shrink-0 min-h-0">
                    <JobTasksPanel jobId={data.id} variant="rail" />
                </aside>
            )}
            </div>
        </div>
    );
}
