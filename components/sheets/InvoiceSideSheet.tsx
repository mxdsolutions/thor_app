"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { Button } from "@/components/ui/button";
import { IconSend as PaperAirplaneIcon, IconCash as BanknotesIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { INVOICE_STATUS_CONFIG } from "@/lib/status-config";
import { useArchiveAction } from "./use-archive-action";

export type Invoice = {
    id: string;
    invoice_number: string | null;
    reference: string | null;
    status: string;
    type: string;
    sub_total?: number;
    tax_total?: number;
    total: number;
    amount_due: number;
    amount_paid: number;
    currency_code?: string;
    issue_date: string | null;
    due_date: string | null;
    fully_paid_on?: string | null;
    notes?: string | null;
    created_at: string;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    archived_at?: string | null;
};

interface InvoiceSideSheetProps {
    invoice: Invoice | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig = INVOICE_STATUS_CONFIG;

/** Side sheet for viewing/editing invoice details, line items, and payment tracking. */
export function InvoiceSideSheet({ invoice, open, onOpenChange, onUpdate }: InvoiceSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Invoice | null>(invoice);
    const [sending, setSending] = useState(false);

    useEffect(() => { setData(invoice); }, [invoice]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch("/api/invoices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const handleSendViaXero = useCallback(async () => {
        if (!data) return;
        setSending(true);
        try {
            const res = await fetch(`/api/invoices/${data.id}/send`, { method: "POST" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Send failed");
            toast.success("Invoice sent via Xero");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to send invoice");
        } finally {
            setSending(false);
        }
    }, [data]);

    const archive = useArchiveAction({
        entityName: "invoice",
        endpoint: data ? `/api/invoices/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.draft;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<BanknotesIcon className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
            title={data.invoice_number || data.reference || "Draft Invoice"}
            subtitle={data.company?.name || "No company"}
            badge={{ label: status.label, dotColor: status.color }}
            actions={archive.menu}
            banner={archive.banner}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "Invoice #",
                                    value: data.invoice_number || "—",
                                    dbColumn: "invoice_number",
                                    type: "text",
                                    rawValue: data.invoice_number,
                                },
                                {
                                    label: "Reference",
                                    value: data.reference || "—",
                                    dbColumn: "reference",
                                    type: "text",
                                    rawValue: data.reference,
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
                                    label: "Total",
                                    value: formatCurrency(data.total),
                                },
                                {
                                    label: "Amount Due",
                                    value: formatCurrency(data.amount_due),
                                },
                                {
                                    label: "Amount Paid",
                                    value: formatCurrency(data.amount_paid),
                                },
                                {
                                    label: "Issue Date",
                                    value: data.issue_date || null,
                                    dbColumn: "issue_date",
                                    type: "text",
                                    rawValue: data.issue_date,
                                },
                                {
                                    label: "Due Date",
                                    value: data.due_date || null,
                                    dbColumn: "due_date",
                                    type: "text",
                                    rawValue: data.due_date,
                                },
                                {
                                    label: "Created",
                                    value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                },
                            ]}
                        />
                    </div>

                    {data.company && (
                        <LinkedEntityCard
                            label="Company"
                            title={data.company.name}
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {data.company.name[0]}
                                </span>
                            }
                        />
                    )}

                    {data.contact && (
                        <LinkedEntityCard
                            label="Contact"
                            title={`${data.contact.first_name} ${data.contact.last_name}`}
                            icon={
                                <span className="text-[9px] font-bold text-muted-foreground">
                                    {data.contact.first_name[0]}{data.contact.last_name[0]}
                                </span>
                            }
                        />
                    )}

                    {(data.status === "authorised" || data.status === "submitted") && (
                        <div className="pt-2">
                            <Button
                                className="w-full rounded-xl"
                                onClick={handleSendViaXero}
                                disabled={sending}
                            >
                                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                                {sending ? "Sending..." : "Send via Xero"}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="invoice" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="invoice" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
