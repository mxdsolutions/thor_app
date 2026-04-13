"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { invoiceStatusDotClass } from "@/lib/design-system";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { useInvoices } from "@/lib/swr";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { InvoiceSideSheet } from "@/components/sheets/InvoiceSideSheet";

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
    { key: "company", label: "Company", muted: true, className: "hidden sm:table-cell", render: (inv) => inv.company?.name || "—" },
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
    useMobileHeaderAction(useCallback(() => setCreateOpen(true), []));
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [page, setPage] = useState(0);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const PAGE_SIZE = 20;
    const { data, isLoading, mutate } = useInvoices(page * PAGE_SIZE, PAGE_SIZE);
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

    return (
        <>
            <ScrollableTableLayout
                header={
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
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["All", "draft", "submitted", "authorised", "paid", "voided"].map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </MobileFilters>
                        </div>
                        <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setCreateOpen(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Invoice
                        </Button>
                    </DashboardControls>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={invoices}
                    columns={columns}
                    loading={isLoading}
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
