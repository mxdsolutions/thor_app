"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { quoteStatusDotClass } from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { useQuotes } from "@/lib/swr";
import { CreateQuoteModal } from "@/components/modals/CreateQuoteModal";
import { QuoteSideSheet } from "@/components/sheets/QuoteSideSheet";

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
    { key: "contact", label: "Contact", muted: true, className: "hidden sm:table-cell", render: (q) => q.contact ? `${q.contact.first_name} ${q.contact.last_name}` : "—" },
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
    useMobileHeaderAction(useCallback(() => setCreateOpen(true), []));
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search);
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [page, setPage] = useState(0);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    const PAGE_SIZE = 20;
    const { data, isLoading, mutate } = useQuotes(debouncedSearch || undefined, page * PAGE_SIZE, PAGE_SIZE);
    const total: number = data?.total || 0;

    const quotes = useMemo(() => {
        const all: Quote[] = data?.items || [];
        return statusFilter === "All" ? all : all.filter(q => q.status === statusFilter);
    }, [data?.items, statusFilter]);

    return (
        <>
            <ScrollableTableLayout
                header={
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
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["All", "draft", "sent", "accepted", "rejected"].map(s => (
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
                            Add Quote
                        </Button>
                    </DashboardControls>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={quotes}
                    columns={columns}
                    loading={isLoading}
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
