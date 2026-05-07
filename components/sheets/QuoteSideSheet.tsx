"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { Button } from "@/components/ui/button";
import {
    IconDownload as ArrowDownTrayIcon,
    IconPencil as PencilIcon,
    IconSend as SendIcon,
    IconBuildingWarehouse as SupplierIcon,
} from "@tabler/icons-react";
import { useTenantOptional } from "@/lib/tenant-context";
import { toast } from "sonner";
import { QUOTE_STATUS_CONFIG } from "@/lib/status-config";
import { useQuotePurchaseOrders, fetcher } from "@/lib/swr";
import { useArchiveAction } from "./use-archive-action";
import useSWR from "swr";

import { QuoteDetailsTab } from "./quote-tabs/QuoteDetailsTab";
import { QuoteRelatedTab } from "./quote-tabs/QuoteRelatedTab";

const EditQuoteModal = lazy(() =>
    import("@/components/modals/EditQuoteModal").then(mod => ({ default: mod.EditQuoteModal }))
);
const ComposeEmailModal = lazy(() =>
    import("@/components/modals/ComposeEmailModal").then(mod => ({ default: mod.ComposeEmailModal }))
);
const CreatePurchaseOrderModal = lazy(() =>
    import("@/components/modals/CreatePurchaseOrderModal").then(mod => ({ default: mod.CreatePurchaseOrderModal }))
);
const PurchaseOrderSideSheet = lazy(() =>
    import("@/components/sheets/PurchaseOrderSideSheet").then(mod => ({ default: mod.PurchaseOrderSideSheet }))
);
import type { PurchaseOrderItem } from "@/components/sheets/PurchaseOrderSideSheet";

export type Quote = {
    id: string;
    title: string;
    description: string | null;
    scope_description?: string | null;
    status: string;
    total_amount: number;
    valid_until: string | null;
    notes: string | null;
    created_at: string;
    material_margin?: number | null;
    labour_margin?: number | null;
    contact_id?: string | null;
    company_id?: string | null;
    job_id?: string | null;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string; email?: string | null; company_id?: string | null } | null;
    job?: { id: string; title: string; status?: string } | null;
    archived_at?: string | null;
};

interface QuoteSideSheetProps {
    quote: Quote | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig = QUOTE_STATUS_CONFIG;

type SelectedPo = PurchaseOrderItem;

/** Side sheet for viewing/editing quote details, line items, and margin calculations. */
export function QuoteSideSheet({ quote, open, onOpenChange, onUpdate }: QuoteSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Quote | null>(quote);
    const [downloading, setDownloading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [selectedPo, setSelectedPo] = useState<SelectedPo | null>(null);
    const [emailDefaults, setEmailDefaults] = useState<{
        to: string;
        subject: string;
        body: string;
        attachments: { name: string; contentType: string; contentBytes: string }[];
    } | null>(null);
    const tenant = useTenantOptional();
    const { data: outlookStatus } = useSWR(open ? "/api/integrations/outlook" : null, (url: string) => fetch(url).then(r => r.json()));
    const hasEmailIntegration = outlookStatus?.connected === true;

    useEffect(() => { setData(quote); }, [quote]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    /** Generate the quote PDF blob */
    const generatePDFBlob = useCallback(async (): Promise<Blob> => {
        const [quoteRes, liRes, secRes] = await Promise.all([
            fetch(`/api/quotes?search=${encodeURIComponent(data!.title)}&limit=1`),
            fetch(`/api/quote-line-items?quote_id=${data!.id}`),
            fetch(`/api/quote-sections?quote_id=${data!.id}`),
        ]);
        const [quoteData, liData, secData] = await Promise.all([quoteRes.json(), liRes.json(), secRes.json()]);
        const fullQuote = quoteData.items?.find((q: Quote) => q.id === data!.id) || data;
        const lineItems = liData.lineItems || [];
        const pdfSections = secData.sections || [];

        const [{ pdf }, { QuotePDF }] = await Promise.all([
            import("@react-pdf/renderer"),
            import("@/components/quotes/QuotePDF"),
        ]);
        const { createElement } = await import("react");
        const element = createElement(QuotePDF, { quote: fullQuote, lineItems, sections: pdfSections, tenant: tenant! });
        return pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
    }, [data, tenant]);

    const handleDownloadPDF = useCallback(async () => {
        if (!data) return;
        setDownloading(true);
        try {
            const blob = await generatePDFBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    }, [data, generatePDFBlob]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch("/api/quotes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update field");
        }
    }, [data, onUpdate]);

    const handleSendQuote = useCallback(async () => {
        if (!data) return;
        setSending(true);
        try {
            const blob = await generatePDFBlob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((str, byte) => str + String.fromCharCode(byte), "")
            );

            const contactEmail = data.contact?.email || null;
            const contactName = data.contact
                ? `${data.contact.first_name} ${data.contact.last_name}`
                : "";
            const companyName = data.company?.name || "";

            setEmailDefaults({
                to: contactEmail || "",
                subject: `${data.title}${companyName ? ` — ${companyName}` : ""}`,
                body: `<p>Hi${contactName ? ` ${contactName.split(" ")[0]}` : ""},</p><p>Please find the attached quote for your review.</p><p>If you have any questions, feel free to reach out.</p><p>Kind regards</p>`,
                attachments: [{
                    name: `${data.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`,
                    contentType: "application/pdf",
                    contentBytes: base64,
                }],
            });
            setComposeOpen(true);
        } catch (err) {
            console.error("Failed to prepare quote email:", err);
            toast.error("Failed to generate quote PDF");
        } finally {
            setSending(false);
        }
    }, [data, generatePDFBlob]);

    const archive = useArchiveAction({
        entityName: "quote",
        endpoint: data ? `/api/quotes/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    // Quote → PO progress: show "X of Y line items have POs" so the user can
    // see at a glance whether more POs need to be generated for this quote.
    const { data: posData, mutate: mutatePos } = useQuotePurchaseOrders(open && data?.id ? data.id : null);
    const { data: lineItemsData } = useSWR<{ items?: { id: string }[]; lineItems?: { id: string }[] }>(
        open && data?.id ? `/api/quote-line-items?quote_id=${data.id}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );
    const totalLineItems = (lineItemsData?.items ?? lineItemsData?.lineItems ?? []).length;
    const allocatedLineItemIds = useMemo(() => {
        const ids = new Set<string>();
        type POSummary = { line_items?: { source_quote_line_item_id: string | null }[] };
        for (const po of (posData?.items as POSummary[] | undefined) ?? []) {
            for (const li of po.line_items ?? []) {
                if (li.source_quote_line_item_id) ids.add(li.source_quote_line_item_id);
            }
        }
        return ids;
    }, [posData]);
    const allocatedCount = allocatedLineItemIds.size;
    const canGeneratePo = !!data?.job_id && !data?.archived_at;

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.draft;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "related", label: "Related" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const isDraft = data.status === "draft";

    return (
        <>
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
                </svg>
            }
            iconBg="bg-secondary"
            title={data.title}
            subtitle={null}
            badge={{ label: status.label, dotColor: status.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            banner={archive.banner}
            actions={
                <>
                    {isDraft && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex rounded-lg h-8 text-sm gap-1.5"
                            onClick={() => setEditOpen(true)}
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Edit Quote
                        </Button>
                    )}
                    {canGeneratePo && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex rounded-lg h-8 text-sm gap-1.5"
                            onClick={() => setPoModalOpen(true)}
                        >
                            <SupplierIcon className="w-3.5 h-3.5" />
                            Generate PO
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:inline-flex rounded-lg h-8 text-sm gap-1.5"
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        {downloading ? "Generating..." : "View PDF"}
                    </Button>
                    {archive.menu}
                </>
            }
            footer={
                <div className="space-y-2">
                    {/* Mobile-only action row */}
                    <div className="flex gap-2 sm:hidden">
                        {isDraft && (
                            <Button
                                variant="outline"
                                className="flex-1 rounded-lg h-10 text-sm gap-1.5"
                                onClick={() => setEditOpen(true)}
                            >
                                <PencilIcon className="w-4 h-4" />
                                Edit Quote
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="flex-1 rounded-lg h-10 text-sm gap-1.5"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            {downloading ? "Generating..." : "View PDF"}
                        </Button>
                    </div>
                    {/* Send Quote — always visible */}
                    {!hasEmailIntegration && data.status !== "sent" && (
                        <p className="text-xs text-muted-foreground text-center">
                            Connect your Outlook account in Settings to send quotes from the app.
                        </p>
                    )}
                    <Button
                        className="w-full rounded-lg h-11 text-sm gap-2 bg-foreground text-background hover:bg-foreground/90"
                        onClick={handleSendQuote}
                        disabled={sending || data.status === "sent" || !hasEmailIntegration}
                    >
                        <SendIcon className="w-4 h-4" />
                        {sending ? "Preparing..." : data.status === "sent" ? "Quote Sent" : "Send Quote"}
                    </Button>
                </div>
            }
        >
            {activeTab === "details" && (
                <QuoteDetailsTab data={data} open={open} onSave={handleSave} />
            )}

            {activeTab === "related" && (
                <>
                    <QuoteRelatedTab data={data} setData={setData} onUpdate={onUpdate} open={open} />
                    {canGeneratePo && (
                        <div className="mt-4 rounded-xl border border-border bg-card p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">Purchase orders</p>
                                    <p className="text-xs text-muted-foreground">
                                        {totalLineItems > 0
                                            ? `${allocatedCount} of ${totalLineItems} line items have POs`
                                            : "No quote line items yet"}
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => setPoModalOpen(true)}>
                                    <SupplierIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Generate PO
                                </Button>
                            </div>
                            {(posData?.items?.length ?? 0) > 0 && (
                                <div className="space-y-1.5">
                                    {((posData?.items ?? []) as SelectedPo[]).map((po) => (
                                        <button
                                            key={po.id}
                                            type="button"
                                            onClick={() => setSelectedPo(po)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg border bg-background text-sm hover:bg-secondary/40 transition-colors text-left"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">
                                                    {po.company?.name || po.title || po.reference_id || "Untitled PO"}
                                                </p>
                                                <p className="text-xs text-muted-foreground capitalize">{po.status}</p>
                                            </div>
                                            <span className="font-semibold">${Number(po.total_amount || 0).toFixed(2)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="quote" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="quote" entityId={data.id} />
            )}
        </SideSheetLayout>

        {editOpen && (
            <Suspense fallback={null}>
                <EditQuoteModal
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    quoteId={data.id}
                    onUpdated={onUpdate}
                />
            </Suspense>
        )}

        {composeOpen && emailDefaults && (
            <Suspense fallback={null}>
                <ComposeEmailModal
                    open={composeOpen}
                    onOpenChange={setComposeOpen}
                    defaultTo={emailDefaults.to}
                    defaultSubject={emailDefaults.subject}
                    defaultBody={emailDefaults.body}
                    defaultAttachments={emailDefaults.attachments}
                    onSent={() => {
                        // Mark quote as sent
                        fetch("/api/quotes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: data.id, status: "sent" }),
                        }).then((res) => {
                            if (res.ok) {
                                setData(prev => prev ? { ...prev, status: "sent" } : prev);
                                onUpdate?.();
                            }
                        });
                    }}
                />
            </Suspense>
        )}

        {poModalOpen && data.job_id && (
            <Suspense fallback={null}>
                <CreatePurchaseOrderModal
                    open={poModalOpen}
                    onOpenChange={setPoModalOpen}
                    jobId={data.job_id}
                    sourceQuoteId={data.id}
                    onCreated={() => {
                        mutatePos();
                        onUpdate?.();
                    }}
                />
            </Suspense>
        )}

        <Suspense fallback={null}>
            <PurchaseOrderSideSheet
                purchaseOrder={selectedPo}
                open={!!selectedPo}
                onOpenChange={(o) => { if (!o) setSelectedPo(null); }}
                onUpdate={() => mutatePos()}
            />
        </Suspense>
        </>
    );
}
