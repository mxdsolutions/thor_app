"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { createClient } from "@/lib/supabase/client";
import { QuoteHeader } from "@/components/quotes/QuoteHeader";
import { Button } from "@/components/ui/button";
import { IconDownload as ArrowDownTrayIcon } from "@tabler/icons-react";
import { useTenantOptional } from "@/lib/tenant-context";
import { toast } from "sonner";
import { QUOTE_STATUS_CONFIG } from "@/lib/status-config";

type Quote = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    total_amount: number;
    valid_until: string | null;
    notes: string | null;
    created_at: string;
    material_margin?: number | null;
    labour_margin?: number | null;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
};

interface QuoteSideSheetProps {
    quote: Quote | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig = QUOTE_STATUS_CONFIG;

/** Side sheet for viewing/editing quote details, line items, and margin calculations. */
export function QuoteSideSheet({ quote, open, onOpenChange, onUpdate }: QuoteSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Quote | null>(quote);
    const [downloading, setDownloading] = useState(false);
    const tenant = useTenantOptional();

    useEffect(() => { setData(quote); }, [quote]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleDownloadPDF = useCallback(async () => {
        if (!data) return;
        setDownloading(true);
        try {
            // Fetch full quote data (with margins) and line items in parallel
            const [quoteRes, liRes] = await Promise.all([
                fetch(`/api/quotes?search=${encodeURIComponent(data.title)}&limit=1`),
                fetch(`/api/quote-line-items?quote_id=${data.id}`),
            ]);
            const [quoteData, liData] = await Promise.all([quoteRes.json(), liRes.json()]);
            const fullQuote = quoteData.items?.find((q: Quote) => q.id === data.id) || data;
            const lineItems = liData.lineItems || [];

            // Dynamic import to avoid loading react-pdf until needed
            const [{ pdf }, { QuotePDF }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("@/components/quotes/QuotePDF"),
            ]);

            const { createElement } = await import("react");
            const blob = await pdf(
                createElement(QuotePDF, { quote: fullQuote, lineItems, tenant: tenant! }) as any
            ).toBlob();

            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    }, [data, tenant]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("quotes")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

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
            icon={
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
                </svg>
            }
            iconBg="bg-violet-500/10"
            title={data.title}
            subtitle={data.company?.name || "No company"}
            badge={{ label: status.label, dotColor: status.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    <QuoteHeader />

                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "Title",
                                    value: data.title,
                                    dbColumn: "title",
                                    type: "text",
                                    rawValue: data.title,
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
                                    label: "Amount",
                                    value: formatCurrency(data.total_amount),
                                    dbColumn: "total_amount",
                                    type: "text",
                                    rawValue: String(data.total_amount),
                                },
                                {
                                    label: "Valid Until",
                                    value: data.valid_until || null,
                                    dbColumn: "valid_until",
                                    type: "text",
                                    rawValue: data.valid_until,
                                },
                                {
                                    label: "Created",
                                    value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                },
                            ]}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "Description",
                                    value: data.description || null,
                                    dbColumn: "description",
                                    type: "text",
                                    rawValue: data.description,
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

                    <div className="pt-2">
                        <Button
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            {downloading ? "Generating..." : "View PDF"}
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="quote" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="quote" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
