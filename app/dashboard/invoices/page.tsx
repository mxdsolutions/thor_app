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
    invoiceStatusDotClass,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
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

export default function InvoicesPage() {
    usePageTitle("Invoices");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const { data, isLoading, mutate } = useInvoices();
    const allInvoices: Invoice[] = data?.items || [];

    const invoices = allInvoices.filter((inv) => {
        const matchesSearch =
            !search ||
            (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.reference || "").toLowerCase().includes(search.toLowerCase()) ||
            (inv.company?.name || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <>
            <ScrollableTableLayout
                header={
                    <>
                        <DashboardControls>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 min-w-[320px] max-w-xl">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search invoices..."
                                        className="pl-9 rounded-xl border-border/50"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
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
                            </div>
                            <Button className="px-6 shrink-0" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Invoice
                            </Button>
                        </DashboardControls>
                    </>
                }
            >
                {isLoading ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">Loading invoices...</div>
                ) : (
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead + " sticky top-0 z-10"}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Invoice #</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Company</th>
                                <th className={tableHeadCell + " px-4"}>Status</th>
                                <th className={tableHeadCell + " px-4 text-right"}>Total</th>
                                <th className={tableHeadCell + " px-4 text-right hidden sm:table-cell"}>Due</th>
                                <th className={tableHeadCell + " px-4 hidden md:table-cell"}>Due Date</th>
                                <th className={tableHeadCell + " px-4 hidden md:table-cell"}>Created</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedInvoice(inv)}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <span className="font-semibold">{inv.invoice_number || inv.reference || "Draft"}</span>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {inv.company?.name || "—"}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", invoiceStatusDotClass[inv.status] || "bg-gray-400")} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">{inv.status}</span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " px-4 text-right"}>
                                        <span className="font-bold text-sm">{formatCurrency(inv.total)}</span>
                                    </td>
                                    <td className={tableCell + " px-4 text-right hidden sm:table-cell"}>
                                        <span className="text-sm text-muted-foreground">{formatCurrency(inv.amount_due)}</span>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                        {inv.due_date || "—"}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                        {timeAgo(inv.created_at)}
                                    </td>
                                    <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                                        {allInvoices.length === 0 ? "No invoices yet. Create your first invoice." : "No invoices match your filters."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
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
