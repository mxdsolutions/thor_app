"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconReceipt as ReceiptIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { RECEIPT_CATEGORIES, type ReceiptCategory } from "@/lib/validation";
import { formatBytes } from "@/lib/file-utils";

const CATEGORY_LABELS: Record<ReceiptCategory, string> = {
    materials: "Materials",
    labour: "Labour",
    fuel: "Fuel",
    tools: "Tools",
    meals: "Meals",
    other: "Other",
};

export type ReceiptItem = {
    id: string;
    job_id: string;
    file_id: string;
    receipt_date: string | null;
    vendor_name: string | null;
    amount: number | null;
    gst_amount: number | null;
    category: ReceiptCategory | null;
    notes: string | null;
    created_at: string;
    archived_at?: string | null;
    file?: { id: string; name: string; mime_type: string | null; size_bytes: number } | null;
    job?: { id: string; job_title: string } | null;
    creator?: { id: string; full_name: string | null; email: string | null } | null;
};

interface ReceiptSideSheetProps {
    receipt: ReceiptItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

type ReceiptDetailResponse = { item: ReceiptItem & { photo_url: string | null } };

export function ReceiptSideSheet({ receipt, open, onOpenChange, onUpdate }: ReceiptSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<ReceiptItem | null>(receipt);

    useEffect(() => { setData(receipt); }, [receipt]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    // Re-fetch on open to get a fresh signed photo URL (photo_url isn't on the
    // list endpoint and signed URLs only live ~10 min anyway).
    const { data: detail, mutate: revalidate } = useSWR<ReceiptDetailResponse>(
        data && open ? `/api/receipts/${data.id}` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 5000 }
    );
    const photoUrl = detail?.item.photo_url ?? null;
    const isImage = !!data?.file?.mime_type?.startsWith("image/");

    const archive = useArchiveAction({
        entityName: "receipt",
        endpoint: data ? `/api/receipts/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    const handleSave = useCallback(
        async <K extends keyof ReceiptItem>(field: K, value: ReceiptItem[K]) => {
            if (!data) return;
            const res = await fetch(`/api/receipts/${data.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) {
                toast.error("Failed to save");
                return;
            }
            setData((prev) => prev ? { ...prev, [field]: value } : prev);
            onUpdate?.();
            revalidate();
        },
        [data, onUpdate, revalidate]
    );

    if (!data) return null;

    const tabs = [{ id: "details", label: "Details" }];
    const totalLabel = data.amount != null ? `$${data.amount.toFixed(2)}` : "—";
    const dateLabel = data.receipt_date
        ? new Date(data.receipt_date + "T00:00:00").toLocaleDateString("en-AU", { dateStyle: "medium" })
        : "Not set";
    const subtitle = [data.vendor_name, dateLabel].filter(Boolean).join(" · ") || "Receipt";

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<ReceiptIcon className="w-7 h-7 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
            title={data.vendor_name || "Untitled receipt"}
            subtitle={subtitle}
            badge={{ label: totalLabel, dotColor: "bg-emerald-500" }}
            actions={archive.menu}
            banner={archive.banner}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            <div className="space-y-4">
                {/* Photo */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {isImage && photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={photoUrl}
                            alt={data.vendor_name || "Receipt"}
                            className="w-full max-h-[420px] object-contain bg-secondary/30"
                        />
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            {data.file?.name || "Receipt file"}
                            {data.file ? ` · ${formatBytes(data.file.size_bytes)}` : ""}
                            {photoUrl && (
                                <a
                                    href={photoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 underline hover:text-foreground"
                                >
                                    Open
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Editable fields */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <Field label="Vendor">
                        <Input
                            defaultValue={data.vendor_name ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (data.vendor_name ?? null)) void handleSave("vendor_name", v);
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="Date">
                        <Input
                            type="date"
                            defaultValue={data.receipt_date ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value || null;
                                if (v !== (data.receipt_date ?? null)) void handleSave("receipt_date", v);
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="Category">
                        <Select
                            value={data.category ?? ""}
                            onValueChange={(v) => void handleSave("category", v as ReceiptCategory)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Pick one" />
                            </SelectTrigger>
                            <SelectContent>
                                {RECEIPT_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Total">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            defaultValue={data.amount ?? ""}
                            onBlur={(e) => {
                                const raw = e.target.value.trim();
                                const v = raw === "" ? null : Number(raw);
                                if (v !== (data.amount ?? null)) void handleSave("amount", v);
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="GST">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            defaultValue={data.gst_amount ?? ""}
                            onBlur={(e) => {
                                const raw = e.target.value.trim();
                                const v = raw === "" ? null : Number(raw);
                                if (v !== (data.gst_amount ?? null)) void handleSave("gst_amount", v);
                            }}
                            className="rounded-lg max-w-xs"
                        />
                    </Field>

                    <Field label="Notes">
                        <textarea
                            rows={2}
                            defaultValue={data.notes ?? ""}
                            onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (data.notes ?? null)) void handleSave("notes", v);
                            }}
                            className="w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </Field>
                </div>

                {/* Read-only metadata */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
                    <Row
                        label="Uploaded by"
                        value={data.creator?.full_name || data.creator?.email || "Unknown"}
                    />
                    <Row
                        label="Uploaded"
                        value={new Date(data.created_at).toLocaleString("en-AU", {
                            dateStyle: "medium",
                            timeStyle: "short",
                        })}
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
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-foreground text-right truncate max-w-md">{value}</span>
        </div>
    );
}
