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
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { quoteStatusDotClass } from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { useQuotes, type ArchiveScope } from "@/lib/swr";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { CreateQuoteModal } from "@/components/modals/CreateQuoteModal";
import { QuoteSideSheet } from "@/components/sheets/QuoteSideSheet";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";
import { PageMetrics, type PageMetric } from "@/components/dashboard/PageMetrics";
import { useCreateDeepLink } from "@/lib/hooks/use-create-deep-link";

const QUOTE_STATUSES = [
    { id: "draft", label: "Draft" },
    { id: "sent", label: "Sent" },
    { id: "accepted", label: "Accepted" },
    { id: "rejected", label: "Rejected" },
    { id: "expired", label: "Expired" },
];

type Quote = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    total_amount: number;
    valid_until: string | null;
    notes: string | null;
    created_at: string;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
};

const columns: DataTableColumn<Quote>[] = [
    { key: "title", label: "Title", render: (q) => <span className="font-semibold">{q.title}</span> },
    {
        key: "contact",
        label: "Contact",
        muted: true,
        className: "hidden sm:table-cell",
        render: (q) => q.contact ? (
            <EntityPreviewCard entityType="contact" entityId={q.contact.id}>
                <span>{q.contact.first_name} {q.contact.last_name}</span>
            </EntityPreviewCard>
        ) : "—",
    },
    {
        key: "status",
        label: "Status",
        render: (q) => (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", quoteStatusDotClass[q.status] || "bg-gray-400")} />
                <span className="font-medium text-muted-foreground capitalize">{q.status}</span>
            </div>
        ),
    },
    { key: "amount", label: "Amount", className: "text-right", render: (q) => <span className="font-bold">{formatCurrency(q.total_amount)}</span> },
    { key: "validUntil", label: "Valid Until", muted: true, className: "hidden sm:table-cell", render: (q) => q.valid_until || "—" },
    { key: "created", label: "Created", muted: true, className: "hidden md:table-cell", render: (q) => timeAgo(q.created_at) },
];

export default function QuotesPage() {
    usePageTitle("Quotes");
    const [createOpen, setCreateOpen] = useState(false);
    useCreateDeepLink(() => setCreateOpen(true));
    const canWriteQuotes = usePermissionOptional("finance.quotes", "write", true);
    useMobileHeaderAction(useCallback(() => {
        if (canWriteQuotes) setCreateOpen(true);
    }, [canWriteQuotes]));
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search);
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [page, setPage] = useState(0);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    const PAGE_SIZE = 20;
    const { data, isLoading, error, mutate } = useQuotes(debouncedSearch || undefined, page * PAGE_SIZE, PAGE_SIZE, archiveScope);
    const total: number = data?.total || 0;

    const quotes = useMemo(() => {
        const all: Quote[] = data?.items || [];
        return statusFilter === "All" ? all : all.filter(q => q.status === statusFilter);
    }, [data?.items, statusFilter]);

    const metrics: PageMetric[] = useMemo(() => {
        const all: Quote[] = data?.items || [];
        const open = all.filter(q => q.status === "draft" || q.status === "sent");
        const pipelineValue = open.reduce((sum, q) => sum + (q.total_amount || 0), 0);
        const acceptedCount = all.filter(q => q.status === "accepted").length;
        return [
            { label: "Total quotes", value: total.toLocaleString(), accent: true },
            { label: "Pipeline value", value: formatCurrency(pipelineValue), sublabel: `${open.length} open` },
            { label: "Accepted", value: acceptedCount.toLocaleString(), tone: acceptedCount > 0 ? "success" : "default" },
        ];
    }, [data?.items, total]);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Quotes</h1>
                        </div>
                        <PageMetrics metrics={metrics} />
                        <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search quotes..."
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
                                    statuses={QUOTE_STATUSES}
                                />
                            </MobileFilters>
                        </div>
                        {canWriteQuotes && (
                            <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Quote
                            </Button>
                        )}
                        </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={quotes}
                    columns={columns}
                    loading={isLoading}
                    error={error}
                    emptyMessage={!data?.items?.length ? "No quotes yet. Create your first quote." : "No quotes match your filters."}
                    onRowClick={setSelectedQuote}
                />
            </ScrollableTableLayout>

            <CreateQuoteModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(quote) => { mutate(); setSelectedQuote(quote as Quote); }}
            />

            <QuoteSideSheet
                quote={selectedQuote}
                open={!!selectedQuote}
                onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}
                onUpdate={() => mutate()}
            />
        </>
    );
}
