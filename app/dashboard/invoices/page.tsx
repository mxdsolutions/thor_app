"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { usePermissionOptional } from "@/lib/tenant-context";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { invoiceStatusDotClass } from "@/lib/design-system";
import { Search as MagnifyingGlassIcon, Plus as PlusIcon } from "lucide-react";
import { useInvoices, type ArchiveScope } from "@/lib/swr";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { InvoiceSideSheet } from "@/components/sheets/InvoiceSideSheet";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";
import { PageMetrics, type PageMetric } from "@/components/dashboard/PageMetrics";
import { useCreateDeepLink } from "@/lib/hooks/use-create-deep-link";

const INVOICE_STATUSES = [
    { id: "draft", label: "Draft" },
    { id: "submitted", label: "Submitted" },
    { id: "authorised", label: "Authorised" },
    { id: "paid", label: "Paid" },
    { id: "voided", label: "Voided" },
];

type Invoice = {
    id: string;
    invoice_number: string | null;
    reference: string | null;
    status: string;
    type: string;
    total: number;
    amount_due: number;
    amount_paid: number;
    issue_date: string | null;
    due_date: string | null;
    created_at: string;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
};

const columns: DataTableColumn<Invoice>[] = [
    { key: "number", label: "Invoice #", render: (inv) => <span className="font-semibold">{inv.invoice_number || inv.reference || "Draft"}</span> },
    {
        key: "company",
        label: "Company",
        muted: true,
        className: "hidden sm:table-cell",
        render: (inv) => inv.company ? (
            <EntityPreviewCard entityType="company" entityId={inv.company.id}>
                <span>{inv.company.name}</span>
            </EntityPreviewCard>
        ) : "—",
    },
    {
        key: "status",
        label: "Status",
        render: (inv) => (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", invoiceStatusDotClass[inv.status] || "bg-gray-400")} />
                <span className="font-medium text-muted-foreground capitalize">{inv.status}</span>
            </div>
        ),
    },
    { key: "total", label: "Total", className: "text-right", render: (inv) => <span className="font-bold">{formatCurrency(inv.total)}</span> },
    { key: "due", label: "Due", className: "text-right hidden sm:table-cell", render: (inv) => <span className="text-muted-foreground">{formatCurrency(inv.amount_due)}</span> },
    { key: "dueDate", label: "Due Date", muted: true, className: "hidden md:table-cell", render: (inv) => inv.due_date || "—" },
    { key: "created", label: "Created", muted: true, className: "hidden md:table-cell", render: (inv) => timeAgo(inv.created_at) },
];

export default function InvoicesPage() {
    usePageTitle("Invoices");
    const [createOpen, setCreateOpen] = useState(false);
    useCreateDeepLink(() => setCreateOpen(true));
    const canWriteInvoices = usePermissionOptional("finance.invoices", "write", true);
    useMobileHeaderAction(useCallback(() => {
        if (canWriteInvoices) setCreateOpen(true);
    }, [canWriteInvoices]));
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [page, setPage] = useState(0);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const PAGE_SIZE = 20;
    const { data, isLoading, error, mutate } = useInvoices(page * PAGE_SIZE, PAGE_SIZE, archiveScope);
    const total: number = data?.total || 0;

    const invoices = useMemo(() => (data?.items || [] as Invoice[]).filter((inv: Invoice) => {
        const matchesSearch =
            !search ||
            (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.reference || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.company?.name || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [data?.items, search, statusFilter]);

    const metrics: PageMetric[] = useMemo(() => {
        const all: Invoice[] = data?.items || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const outstanding = all.reduce((sum, inv) => {
            if (inv.status === "paid" || inv.status === "voided") return sum;
            return sum + (inv.amount_due || 0);
        }, 0);
        const overdueCount = all.filter(inv => {
            if (inv.status === "paid" || inv.status === "voided") return false;
            if (!inv.due_date) return false;
            return new Date(inv.due_date) < today;
        }).length;
        return [
            { label: "Outstanding", value: formatCurrency(outstanding), accent: true, tone: outstanding > 0 ? "warning" : "default" },
            { label: "Total invoices", value: total.toLocaleString() },
            { label: "Overdue", value: overdueCount.toLocaleString(), tone: overdueCount > 0 ? "danger" : "default" },
        ];
    }, [data?.items, total]);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Invoices</h1>
                        </div>
                        <PageMetrics metrics={metrics} />
                        <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search invoices..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <MobileFilters>
                                <ArchiveScopedStatusSelect
                                    archive={archiveScope}
                                    onArchiveChange={setArchiveScope}
                                    status={statusFilter}
                                    onStatusChange={setStatusFilter}
                                    statuses={INVOICE_STATUSES}
                                />
                            </MobileFilters>
                        </div>
                        {canWriteInvoices && (
                            <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Invoice
                            </Button>
                        )}
                        </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={invoices}
                    columns={columns}
                    loading={isLoading}
                    error={error}
                    emptyMessage={!data?.items?.length ? "No invoices yet. Create your first invoice." : "No invoices match your filters."}
                    onRowClick={setSelectedInvoice}
                />
            </ScrollableTableLayout>

            <CreateInvoiceModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(inv) => { mutate(); setSelectedInvoice(inv as Invoice); }}
            />

            <InvoiceSideSheet
                invoice={selectedInvoice}
                open={!!selectedInvoice}
                onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
                onUpdate={() => mutate()}
            />
        </>
    );
}
