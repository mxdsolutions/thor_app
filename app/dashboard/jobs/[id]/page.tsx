"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import { usePageTitle } from "@/lib/page-title-context";
import { ROUTES } from "@/lib/routes";
import {
    useJob,
    useJobScopes,
    useJobQuotes,
    useJobInvoices,
    useJobReports,
    useJobTasks,
} from "@/lib/swr";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { CreateReportModal } from "@/components/modals/CreateReportModal";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { createClient } from "@/lib/supabase/client";
import { useStatusConfig } from "@/lib/swr";
import { DEFAULT_JOB_STATUSES, toStatusConfig } from "@/lib/status-config";
import { toast } from "sonner";

// --- Types ---

type Assignee = { id: string; full_name: string | null; email: string | null };

type Job = {
    id: string;
    description: string;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    scheduled_date: string | null;
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

type Scope = {
    id: string;
    title: string;
    status: string;
};

type Quote = {
    id: string;
    title: string;
    status: string;
    total: number;
    created_at: string;
};

type Invoice = {
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    due_date: string | null;
};

type Report = {
    id: string;
    title: string;
    report_type: string;
    status: string;
};

type Task = {
    id: string;
    title: string;
    priority: number;
    status: string;
    due_date: string | null;
    assigned_to_name: string | null;
};

// --- Status color helpers ---

const paidStatusConfig: Record<string, { label: string; color: string }> = {
    not_paid: { label: "Not Paid", color: "text-rose-500" },
    partly_paid: { label: "Partly Paid", color: "text-amber-500" },
    paid_in_full: { label: "Paid in Full", color: "text-emerald-500" },
};

function quoteStatusClass(status: string): string {
    switch (status) {
        case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
        case "sent": return "bg-blue-50 text-blue-700 border-blue-200";
        case "accepted": return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "rejected": return "bg-rose-50 text-rose-700 border-rose-200";
        case "expired": return "bg-amber-50 text-amber-700 border-amber-200";
        default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
}

function invoiceStatusClass(status: string): string {
    switch (status) {
        case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
        case "submitted": return "bg-blue-50 text-blue-700 border-blue-200";
        case "authorised": return "bg-amber-50 text-amber-700 border-amber-200";
        case "paid": return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "voided": return "bg-rose-50 text-rose-700 border-rose-200";
        default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
}

function reportStatusClass(status: string): string {
    switch (status) {
        case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
        case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
        case "complete": return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "submitted": return "bg-teal-50 text-teal-700 border-teal-200";
        default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
}

function taskPriorityLabel(priority: number): { label: string; className: string } {
    switch (priority) {
        case 1: return { label: "Urgent", className: "bg-rose-50 text-rose-700 border-rose-200" };
        case 2: return { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200" };
        case 3: return { label: "Normal", className: "bg-blue-50 text-blue-700 border-blue-200" };
        case 4: return { label: "Low", className: "bg-gray-100 text-gray-700 border-gray-200" };
        default: return { label: "None", className: "bg-gray-100 text-gray-700 border-gray-200" };
    }
}

function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// --- Tabs ---

const TABS = [
    { id: "overview", label: "Overview" },
    { id: "scopes", label: "Scopes" },
    { id: "quotes", label: "Quotes" },
    { id: "invoices", label: "Invoices" },
    { id: "reports", label: "Reports" },
    { id: "tasks", label: "Tasks" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// --- Main Component ---

export default function JobDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [activeTab, setActiveTab] = useState<TabId>("overview");

    // Core job data
    const { data: jobData, isLoading: jobLoading, mutate: mutateJob } = useJob(id);
    const job: Job | null = jobData?.item ?? null;

    // Line items state (for overview tab)
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    // Conditional SWR for tab data
    const { data: scopesData, isLoading: scopesLoading } = useJobScopes(activeTab === "scopes" ? id : null);
    const { data: quotesData, isLoading: quotesLoading } = useJobQuotes(activeTab === "quotes" ? id : null);
    const { data: invoicesData, isLoading: invoicesLoading } = useJobInvoices(activeTab === "invoices" ? id : null);
    const { data: reportsData, isLoading: reportsLoading } = useJobReports(activeTab === "reports" ? id : null);
    const { data: tasksData, isLoading: tasksLoading } = useJobTasks(activeTab === "tasks" ? id : null);

    // Status config
    const { data: statusData } = useStatusConfig("job");
    const statusConfig = toStatusConfig(statusData?.statuses ?? DEFAULT_JOB_STATUSES);

    // Modal state
    const [showCreateReport, setShowCreateReport] = useState(false);
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);

    // Counts for tab badges
    const scopesCount = scopesData?.items?.length ?? 0;
    const quotesCount = quotesData?.items?.length ?? 0;
    const invoicesCount = invoicesData?.items?.length ?? 0;
    const reportsCount = reportsData?.items?.length ?? 0;
    const tasksCount = tasksData?.items?.length ?? 0;

    // Set page title
    usePageTitle(job?.description || "Job");

    // Fetch line items and services for overview tab
    const fetchLineItems = useCallback(async (jobId: string) => {
        const res = await fetch(`/api/job-line-items?job_id=${jobId}`);
        if (res.ok) {
            const { lineItems: items } = await res.json();
            setLineItems(items || []);
        }
    }, []);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("products").select("id, name, initial_value").eq("status", "active").then(({ data: prods }) => {
            if (prods) setServices(prods);
        });
    }, []);

    useEffect(() => {
        if (job?.id) fetchLineItems(job.id);
    }, [job?.id, fetchLineItems]);

    // Line item handlers
    const handleAddLineItem = async (productId: string, quantity: number, unitPrice: number) => {
        if (!job) return;
        const res = await fetch("/api/job-line-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, product_id: productId, quantity, unit_price: unitPrice }),
        });
        if (res.ok) {
            const { lineItem } = await res.json();
            setLineItems((prev) => [...prev, lineItem]);
            mutateJob();
        } else {
            toast.error("Failed to add service");
        }
    };

    const handleUpdateLineItem = async (itemId: string, field: "quantity" | "unit_price", value: number) => {
        const res = await fetch("/api/job-line-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, [field]: value }),
        });
        if (res.ok) {
            const { lineItem } = await res.json();
            setLineItems((prev) => prev.map((li) => li.id === itemId ? lineItem : li));
            mutateJob();
        } else {
            toast.error("Failed to update");
        }
    };

    const handleDeleteLineItem = async (itemId: string) => {
        const res = await fetch(`/api/job-line-items?id=${itemId}`, { method: "DELETE" });
        if (res.ok) {
            setLineItems((prev) => prev.filter((li) => li.id !== itemId));
            mutateJob();
        } else {
            toast.error("Failed to remove service");
        }
    };

    // --- Loading state ---
    if (jobLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="p-6 space-y-4">
                <Link href={ROUTES.OPS_JOBS} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Jobs
                </Link>
                <div className="text-center py-16 text-sm text-muted-foreground">Job not found.</div>
            </div>
        );
    }

    const status = statusConfig[job.status] || { label: job.status.replace(/_/g, " "), color: "bg-gray-400" };
    const paid = paidStatusConfig[job.paid_status] || { label: job.paid_status, color: "text-muted-foreground" };

    function getTabLabel(tab: (typeof TABS)[number]): string {
        switch (tab.id) {
            case "scopes": return scopesCount > 0 ? `${tab.label} (${scopesCount})` : tab.label;
            case "quotes": return quotesCount > 0 ? `${tab.label} (${quotesCount})` : tab.label;
            case "invoices": return invoicesCount > 0 ? `${tab.label} (${invoicesCount})` : tab.label;
            case "reports": return reportsCount > 0 ? `${tab.label} (${reportsCount})` : tab.label;
            case "tasks": return tasksCount > 0 ? `${tab.label} (${tasksCount})` : tab.label;
            default: return tab.label;
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Back link */}
            <div className="px-4 md:px-6 lg:px-10 pt-4 pb-2">
                <Link
                    href={ROUTES.OPS_JOBS}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Jobs
                </Link>
            </div>

            {/* Tab bar */}
            <div className="px-4 md:px-6 lg:px-10 border-b border-border">
                <div className="flex gap-1 -mb-px overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                                activeTab === tab.id
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            {getTabLabel(tab)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10">
                {activeTab === "overview" && (
                    <OverviewTab
                        job={job}
                        status={status}
                        paid={paid}
                        lineItems={lineItems}
                        services={services}
                        onAddLineItem={handleAddLineItem}
                        onUpdateLineItem={handleUpdateLineItem}
                        onDeleteLineItem={handleDeleteLineItem}
                    />
                )}
                {activeTab === "scopes" && (
                    <ScopesTab
                        scopes={scopesData?.items ?? []}
                        loading={scopesLoading}
                    />
                )}
                {activeTab === "quotes" && (
                    <QuotesTab
                        quotes={quotesData?.items ?? []}
                        loading={quotesLoading}
                    />
                )}
                {activeTab === "invoices" && (
                    <InvoicesTab
                        invoices={invoicesData?.items ?? []}
                        loading={invoicesLoading}
                        onAdd={() => setShowCreateInvoice(true)}
                    />
                )}
                {activeTab === "reports" && (
                    <ReportsTab
                        reports={reportsData?.items ?? []}
                        loading={reportsLoading}
                        onAdd={() => setShowCreateReport(true)}
                    />
                )}
                {activeTab === "tasks" && (
                    <TasksTab
                        tasks={tasksData?.items ?? []}
                        loading={tasksLoading}
                    />
                )}
            </div>

            {/* Modals */}
            <CreateReportModal
                open={showCreateReport}
                onOpenChange={setShowCreateReport}
                defaultValues={{ job_id: job.id, company_id: job.company?.id }}
                onCreated={() => {
                    setShowCreateReport(false);
                    // Re-fetch reports by switching tab off and on (SWR will refetch)
                    if (activeTab === "reports") {
                        setActiveTab("overview");
                        setTimeout(() => setActiveTab("reports"), 0);
                    }
                }}
            />
            <CreateInvoiceModal
                open={showCreateInvoice}
                onOpenChange={setShowCreateInvoice}
                defaultValues={{ job_id: job.id, company_id: job.company?.id }}
                onCreated={() => {
                    setShowCreateInvoice(false);
                    if (activeTab === "invoices") {
                        setActiveTab("overview");
                        setTimeout(() => setActiveTab("invoices"), 0);
                    }
                }}
            />
        </div>
    );
}

// --- Tab Components ---

function TabLoading() {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
    );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            {action}
        </div>
    );
}

// --- Overview Tab ---

function OverviewTab({
    job,
    status,
    paid,
    lineItems,
    services,
    onAddLineItem,
    onUpdateLineItem,
    onDeleteLineItem,
}: {
    job: Job;
    status: { label: string; color: string };
    paid: { label: string; color: string };
    lineItems: LineItem[];
    services: Service[];
    onAddLineItem: (productId: string, quantity: number, unitPrice: number) => Promise<void>;
    onUpdateLineItem: (id: string, field: "quantity" | "unit_price", value: number) => Promise<void>;
    onDeleteLineItem: (id: string) => Promise<void>;
}) {
    return (
        <div className="space-y-6 max-w-4xl">
            {/* Key details card */}
            <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Status */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Status</p>
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", status.color)} />
                            <span className="text-sm font-medium capitalize">{status.label}</span>
                        </div>
                    </div>

                    {/* Company */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Company</p>
                        <p className="text-sm font-medium">{job.company?.name || "---"}</p>
                    </div>

                    {/* Scheduled Date */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Scheduled Date</p>
                        <p className="text-sm font-medium">
                            {job.scheduled_date
                                ? new Date(job.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" })
                                : "---"}
                        </p>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Amount</p>
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(job.amount)}</p>
                    </div>

                    {/* Paid Status */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Paid Status</p>
                        <span className={cn("text-sm font-medium", paid.color)}>{paid.label}</span>
                    </div>

                    {/* Payment Received */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Payment Received</p>
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(job.total_payment_received)}</p>
                    </div>

                    {/* Lead */}
                    {job.lead && (
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lead</p>
                            <Link
                                href={`${ROUTES.CRM_LEADS}?open=${job.lead.id}`}
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                {job.lead.title}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Assignees card */}
            <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assignees ({job.assignees.length})
                </h3>
                {job.assignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignees</p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {job.assignees.map((a) => (
                            <div key={a.id} className="flex items-center gap-2.5 rounded-full bg-secondary px-3 py-1.5">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {getInitials(a.full_name)}
                                </div>
                                <span className="text-sm font-medium">{a.full_name || a.email}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Line items / services card */}
            <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Services ({lineItems.length})
                </h3>
                <LineItemsTable
                    mode="live"
                    items={lineItems}
                    services={services}
                    onAdd={onAddLineItem}
                    onUpdate={onUpdateLineItem}
                    onDelete={onDeleteLineItem}
                />
            </div>
        </div>
    );
}

// --- Scopes Tab ---

function ScopesTab({ scopes, loading }: { scopes: Scope[]; loading: boolean }) {
    if (loading) return <TabLoading />;
    if (scopes.length === 0) {
        return (
            <EmptyState
                message="No scopes yet"
                action={
                    <Button variant="outline" className="rounded-full" onClick={() => toast.info("Coming soon")}>
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        Add Scope
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" className="rounded-full" onClick={() => toast.info("Coming soon")}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    Add Scope
                </Button>
            </div>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <table className={cn(tableBase, "border-collapse min-w-full")}>
                    <thead className={cn(tableHead, "sticky top-0 z-10")}>
                        <tr>
                            <th className={cn(tableHeadCell, "pl-4 md:pl-6 pr-4")}>Name</th>
                            <th className={cn(tableHeadCell, "px-4")}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scopes.map((scope) => (
                            <tr key={scope.id} className={tableRow}>
                                <td className={cn(tableCell, "pl-4 md:pl-6 pr-4 font-medium")}>{scope.title}</td>
                                <td className={cn(tableCell, "px-4")}>
                                    <span className="text-sm capitalize text-muted-foreground">{scope.status.replace(/_/g, " ")}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Quotes Tab ---

function QuotesTab({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
    if (loading) return <TabLoading />;
    if (quotes.length === 0) {
        return (
            <EmptyState
                message="No quotes yet"
                action={
                    <Button variant="outline" className="rounded-full" onClick={() => toast.info("Coming soon")}>
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        New Quote
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" className="rounded-full" onClick={() => toast.info("Coming soon")}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    New Quote
                </Button>
            </div>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <table className={cn(tableBase, "border-collapse min-w-full")}>
                    <thead className={cn(tableHead, "sticky top-0 z-10")}>
                        <tr>
                            <th className={cn(tableHeadCell, "pl-4 md:pl-6 pr-4")}>Title</th>
                            <th className={cn(tableHeadCell, "px-4")}>Status</th>
                            <th className={cn(tableHeadCell, "px-4 text-right")}>Amount</th>
                            <th className={cn(tableHeadCell, "px-4 pr-4 md:pr-6")}>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map((quote) => (
                            <tr key={quote.id} className={tableRow}>
                                <td className={cn(tableCell, "pl-4 md:pl-6 pr-4 font-medium")}>{quote.title}</td>
                                <td className={cn(tableCell, "px-4")}>
                                    <Badge variant="outline" className={cn("capitalize", quoteStatusClass(quote.status))}>
                                        {quote.status}
                                    </Badge>
                                </td>
                                <td className={cn(tableCell, "px-4 text-right font-bold tabular-nums")}>
                                    {formatCurrency(quote.total)}
                                </td>
                                <td className={cn(tableCellMuted, "px-4 pr-4 md:pr-6")}>
                                    {new Date(quote.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Invoices Tab ---

function InvoicesTab({ invoices, loading, onAdd }: { invoices: Invoice[]; loading: boolean; onAdd: () => void }) {
    if (loading) return <TabLoading />;
    if (invoices.length === 0) {
        return (
            <EmptyState
                message="No invoices yet"
                action={
                    <Button variant="outline" className="rounded-full" onClick={onAdd}>
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        New Invoice
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" className="rounded-full" onClick={onAdd}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    New Invoice
                </Button>
            </div>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <table className={cn(tableBase, "border-collapse min-w-full")}>
                    <thead className={cn(tableHead, "sticky top-0 z-10")}>
                        <tr>
                            <th className={cn(tableHeadCell, "pl-4 md:pl-6 pr-4")}>Invoice #</th>
                            <th className={cn(tableHeadCell, "px-4")}>Status</th>
                            <th className={cn(tableHeadCell, "px-4 text-right")}>Amount</th>
                            <th className={cn(tableHeadCell, "px-4 pr-4 md:pr-6")}>Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((inv) => (
                            <tr key={inv.id} className={tableRow}>
                                <td className={cn(tableCell, "pl-4 md:pl-6 pr-4 font-medium")}>{inv.invoice_number || "---"}</td>
                                <td className={cn(tableCell, "px-4")}>
                                    <Badge variant="outline" className={cn("capitalize", invoiceStatusClass(inv.status))}>
                                        {inv.status}
                                    </Badge>
                                </td>
                                <td className={cn(tableCell, "px-4 text-right font-bold tabular-nums")}>
                                    {formatCurrency(inv.total)}
                                </td>
                                <td className={cn(tableCellMuted, "px-4 pr-4 md:pr-6")}>
                                    {inv.due_date
                                        ? new Date(inv.due_date).toLocaleDateString("en-AU", { dateStyle: "medium" })
                                        : "---"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Reports Tab ---

function ReportsTab({ reports, loading, onAdd }: { reports: Report[]; loading: boolean; onAdd: () => void }) {
    if (loading) return <TabLoading />;
    if (reports.length === 0) {
        return (
            <EmptyState
                message="No reports yet"
                action={
                    <Button variant="outline" className="rounded-full" onClick={onAdd}>
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        New Report
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" className="rounded-full" onClick={onAdd}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    New Report
                </Button>
            </div>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <table className={cn(tableBase, "border-collapse min-w-full")}>
                    <thead className={cn(tableHead, "sticky top-0 z-10")}>
                        <tr>
                            <th className={cn(tableHeadCell, "pl-4 md:pl-6 pr-4")}>Title</th>
                            <th className={cn(tableHeadCell, "px-4")}>Type</th>
                            <th className={cn(tableHeadCell, "px-4 pr-4 md:pr-6")}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id} className={tableRow}>
                                <td className={cn(tableCell, "pl-4 md:pl-6 pr-4 font-medium")}>{report.title}</td>
                                <td className={cn(tableCellMuted, "px-4 capitalize")}>{report.report_type?.replace(/_/g, " ") || "---"}</td>
                                <td className={cn(tableCell, "px-4 pr-4 md:pr-6")}>
                                    <Badge variant="outline" className={cn("capitalize", reportStatusClass(report.status))}>
                                        {report.status?.replace(/_/g, " ")}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Tasks Tab ---

function TasksTab({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
    if (loading) return <TabLoading />;
    if (tasks.length === 0) {
        return <EmptyState message="No tasks yet" />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <table className={cn(tableBase, "border-collapse min-w-full")}>
                    <thead className={cn(tableHead, "sticky top-0 z-10")}>
                        <tr>
                            <th className={cn(tableHeadCell, "pl-4 md:pl-6 pr-4")}>Title</th>
                            <th className={cn(tableHeadCell, "px-4")}>Priority</th>
                            <th className={cn(tableHeadCell, "px-4")}>Status</th>
                            <th className={cn(tableHeadCell, "px-4")}>Due Date</th>
                            <th className={cn(tableHeadCell, "px-4 pr-4 md:pr-6")}>Assigned To</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task) => {
                            const priority = taskPriorityLabel(task.priority);
                            return (
                                <tr key={task.id} className={tableRow}>
                                    <td className={cn(tableCell, "pl-4 md:pl-6 pr-4 font-medium")}>{task.title}</td>
                                    <td className={cn(tableCell, "px-4")}>
                                        <Badge variant="outline" className={priority.className}>
                                            {priority.label}
                                        </Badge>
                                    </td>
                                    <td className={cn(tableCell, "px-4")}>
                                        <span className="text-sm capitalize text-muted-foreground">{task.status?.replace(/_/g, " ")}</span>
                                    </td>
                                    <td className={cn(tableCellMuted, "px-4")}>
                                        {task.due_date
                                            ? new Date(task.due_date).toLocaleDateString("en-AU", { dateStyle: "medium" })
                                            : "---"}
                                    </td>
                                    <td className={cn(tableCellMuted, "px-4 pr-4 md:pr-6")}>{task.assigned_to_name || "Unassigned"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
