"use client";

import { useState } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
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

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-400",
    sent: "bg-blue-500",
    accepted: "bg-emerald-500",
    rejected: "bg-red-500",
    expired: "bg-amber-500",
};

export default function QuotesPage() {
    usePageTitle("Quotes");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    const { data, isLoading, mutate } = useQuotes();
    const allQuotes: Quote[] = data?.items || [];

    const quotes = allQuotes.filter(q => {
        const matchesSearch = !search || q.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || q.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
    <>
        <ScrollableTableLayout
            header={
                <>
                    <DashboardControls>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search quotes..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] rounded-xl border-border/50 h-10">
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
                        </div>
                        <Button className="rounded-full px-6 shrink-0" onClick={() => setCreateOpen(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Quote
                        </Button>
                    </DashboardControls>
                </>
            }
        >
            {isLoading ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Loading quotes...</div>
            ) : (
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Company</th>
                            <th className={tableHeadCell + " px-4"}>Status</th>
                            <th className={tableHeadCell + " px-4 text-right"}>Amount</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Valid Until</th>
                            <th className={tableHeadCell + " px-4 hidden md:table-cell"}>Created</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map((quote) => (
                            <tr key={quote.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedQuote(quote)}>
                                <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                    <span className="font-semibold text-sm">{quote.title}</span>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                    {quote.company?.name || "—"}
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[quote.status] || "bg-gray-400")} />
                                        <span className="text-xs font-medium text-muted-foreground capitalize">{quote.status}</span>
                                    </div>
                                </td>
                                <td className={tableCell + " px-4 text-right"}>
                                    <span className="font-bold text-sm">{formatCurrency(quote.total_amount)}</span>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                    {quote.valid_until || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                    {timeAgo(quote.created_at)}
                                </td>
                                <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                    <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                        <ArrowUpRightIcon className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {quotes.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                                    {allQuotes.length === 0 ? "No quotes yet. Create your first quote." : "No quotes match your filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
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
