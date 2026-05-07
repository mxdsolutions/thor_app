"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    IconBuildingWarehouse as SupplierIcon,
    IconPlus as PlusIcon,
    IconTrash as TrashIcon,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { PURCHASE_ORDER_STATUSES, type PurchaseOrderStatus } from "@/lib/validation";

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    received: "Received",
    paid: "Paid",
};

const STATUS_DOT: Record<PurchaseOrderStatus, string> = {
    draft: "bg-muted-foreground",
    sent: "bg-blue-500",
    received: "bg-amber-500",
    paid: "bg-emerald-500",
};

type LineItem = {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    sort_order: number;
    source_quote_line_item_id?: string | null;
};

export type PurchaseOrderItem = {
    id: string;
    job_id: string;
    company_id: string;
    source_quote_id: string | null;
    title: string | null;
    reference_id: string | null;
    status: PurchaseOrderStatus;
    expected_date: string | null;
    total_amount: number;
    gst_inclusive: boolean;
    notes: string | null;
    created_at: string;
    archived_at?: string | null;
    company?: { id: string; name: string } | null;
    job?: { id: string; job_title: string } | null;
    source_quote?: { id: string; title: string | null } | null;
    line_items?: LineItem[];
};

interface PurchaseOrderSideSheetProps {
    purchaseOrder: PurchaseOrderItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

type DetailResponse = { item: PurchaseOrderItem };

export function PurchaseOrderSideSheet({
    purchaseOrder,
    open,
    onOpenChange,
    onUpdate,
}: PurchaseOrderSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<PurchaseOrderItem | null>(purchaseOrder);

    useEffect(() => { setData(purchaseOrder); }, [purchaseOrder]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    // The list endpoint doesn't include line_items — fetch the detail
    // endpoint when the sheet opens so we have them.
    const { data: detail, mutate: revalidate } = useSWR<DetailResponse>(
        data && open ? `/api/purchase-orders/${data.id}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    useEffect(() => {
        if (detail?.item) setData(detail.item);
    }, [detail]);

    const archive = useArchiveAction({
        entityName: "purchase order",
        endpoint: data ? `/api/purchase-orders/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    const handleSave = useCallback(
        async (patch: Partial<PurchaseOrderItem>) => {
            if (!data) return;
            const res = await fetch(`/api/purchase-orders/${data.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (!res.ok) {
                toast.error("Failed to save");
                return;
            }
            const json = await res.json();
            setData((prev) => prev ? { ...prev, ...json.item } : prev);
            onUpdate?.();
            revalidate();
        },
        [data, onUpdate, revalidate]
    );

    const handleAddLine = useCallback(async () => {
        if (!data) return;
        const res = await fetch(`/api/purchase-orders/${data.id}/line-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                description: "New item",
                quantity: 1,
                unit_price: 0,
                sort_order: (data.line_items?.length ?? 0),
            }),
        });
        if (!res.ok) {
            toast.error("Failed to add line");
            return;
        }
        revalidate();
        onUpdate?.();
    }, [data, onUpdate, revalidate]);

    const handleUpdateLine = useCallback(
        async (itemId: string, patch: Partial<LineItem>) => {
            if (!data) return;
            const res = await fetch(`/api/purchase-orders/${data.id}/line-items/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            if (!res.ok) {
                toast.error("Failed to save line");
                return;
            }
            revalidate();
            onUpdate?.();
        },
        [data, onUpdate, revalidate]
    );

    const handleRemoveLine = useCallback(
        async (itemId: string) => {
            if (!data) return;
            const res = await fetch(`/api/purchase-orders/${data.id}/line-items/${itemId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                toast.error("Failed to remove line");
                return;
            }
            revalidate();
            onUpdate?.();
        },
        [data, onUpdate, revalidate]
    );

    if (!data) return null;

    const tabs = [{ id: "details", label: "Details" }];
    const titleLabel = data.title || data.reference_id || (data.company?.name ? `PO · ${data.company.name}` : "Purchase order");
    const subtitle = [
        data.company?.name,
        data.expected_date && new Date(data.expected_date + "T00:00:00").toLocaleDateString("en-AU", { dateStyle: "medium" }),
    ].filter(Boolean).join(" · ") || "Purchase order";

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<SupplierIcon className="w-7 h-7 text-amber-600" />}
            iconBg="bg-amber-500/10"
            title={titleLabel}
            subtitle={subtitle}
            badge={{
                label: STATUS_LABELS[data.status],
                dotColor: STATUS_DOT[data.status],
            }}
            actions={archive.menu}
            banner={archive.banner}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <Field label="Title">
                        <Input
                            defaultValue={data.title ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (data.title ?? null)) void handleSave({ title: v });
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="PO number">
                        <Input
                            defaultValue={data.reference_id ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (data.reference_id ?? null)) void handleSave({ reference_id: v });
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="Status">
                        <Select
                            value={data.status}
                            onValueChange={(v) => void handleSave({ status: v as PurchaseOrderStatus })}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PURCHASE_ORDER_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Expected">
                        <Input
                            type="date"
                            defaultValue={data.expected_date ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value || null;
                                if (v !== (data.expected_date ?? null)) void handleSave({ expected_date: v });
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Row label="Supplier" value={data.company?.name || "—"} />
                    {data.source_quote && (
                        <Row label="Source quote" value={data.source_quote.title || "Untitled quote"} />
                    )}
                    <Row label="Total" value={`$${Number(data.total_amount || 0).toFixed(2)}`} />
                </div>

                {/* Line items */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Line items</p>
                        <Button size="sm" variant="outline" onClick={handleAddLine}>
                            <PlusIcon className="w-3.5 h-3.5 mr-1" />
                            Add line
                        </Button>
                    </div>
                    {(data.line_items ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 text-center">No line items yet.</p>
                    ) : (
                        <div className="rounded-lg border border-border divide-y divide-border">
                            {(data.line_items ?? []).map((li) => (
                                <div key={li.id} className="p-3 flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <Input
                                            defaultValue={li.description}
                                            onBlur={(e) => {
                                                const v = e.target.value;
                                                if (v !== li.description) void handleUpdateLine(li.id, { description: v });
                                            }}
                                            className="rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-44">
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            defaultValue={li.quantity}
                                            onBlur={(e) => {
                                                const v = Number(e.target.value) || 0;
                                                if (v !== Number(li.quantity)) void handleUpdateLine(li.id, { quantity: v });
                                            }}
                                            className="rounded-lg text-sm"
                                            placeholder="Qty"
                                        />
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            defaultValue={li.unit_price}
                                            onBlur={(e) => {
                                                const v = Number(e.target.value) || 0;
                                                if (v !== Number(li.unit_price)) void handleUpdateLine(li.id, { unit_price: v });
                                            }}
                                            className="rounded-lg text-sm"
                                            placeholder="Unit $"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleRemoveLine(li.id)}
                                        className="text-muted-foreground hover:text-rose-500 mt-2"
                                        aria-label="Remove line"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                    <textarea
                        rows={3}
                        defaultValue={data.notes ?? ""}
                        onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== (data.notes ?? null)) void handleSave({ notes: v });
                        }}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                </div>
            </div>
        </SideSheetLayout>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground shrink-0">{label}</span>
            {children}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm text-foreground text-right truncate max-w-md">{value}</span>
        </div>
    );
}
