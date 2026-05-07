"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
    IconPlus as PlusIcon,
    IconReceipt as ReceiptIcon,
    IconBuildingWarehouse as SupplierIcon,
    IconClock as ClockIcon,
} from "@tabler/icons-react";
import { ReceiptSideSheet, type ReceiptItem } from "@/components/sheets/ReceiptSideSheet";
import { PurchaseOrderSideSheet, type PurchaseOrderItem } from "@/components/sheets/PurchaseOrderSideSheet";
import { TimesheetSideSheet, type TimesheetSideSheetItem } from "@/components/sheets/TimesheetSideSheet";
import { formatDuration } from "@/lib/utils";

export type TimesheetItem = TimesheetSideSheetItem;

interface Props {
    jobId: string;
    purchaseOrders: PurchaseOrderItem[];
    receipts: ReceiptItem[];
    timesheets: TimesheetItem[];
    onOpenCreatePO: () => void;
    onOpenCreateReceipt: () => void;
    onOpenCreateTimesheet: () => void;
}

export function JobExpensesTab({
    jobId,
    purchaseOrders,
    receipts,
    timesheets,
    onOpenCreatePO,
    onOpenCreateReceipt,
    onOpenCreateTimesheet,
}: Props) {
    const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
    const [selectedPo, setSelectedPo] = useState<PurchaseOrderItem | null>(null);
    const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetItem | null>(null);

    return (
        <div className="space-y-6">
            {/* Purchase orders */}
            <section className="space-y-2 px-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-base font-semibold text-foreground">Purchase Orders</p>
                    <Button size="sm" onClick={onOpenCreatePO}>
                        <PlusIcon className="w-3.5 h-3.5 mr-1" />
                        New PO
                    </Button>
                </div>
                {purchaseOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No purchase orders yet</p>
                ) : purchaseOrders.map((po) => (
                    <button
                        key={po.id}
                        type="button"
                        onClick={() => setSelectedPo(po)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <SupplierIcon className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-medium truncate">
                                    {po.company?.name || po.title || po.reference_id || "Untitled PO"}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">{po.status}</p>
                            </div>
                        </div>
                        <span className="font-semibold">${Number(po.total_amount || 0).toFixed(2)}</span>
                    </button>
                ))}
            </section>

            {/* Receipts */}
            <section className="space-y-2 px-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-base font-semibold text-foreground">Receipts</p>
                    <Button size="sm" onClick={onOpenCreateReceipt}>
                        <PlusIcon className="w-3.5 h-3.5 mr-1" />
                        New Receipt
                    </Button>
                </div>
                {receipts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No receipts yet</p>
                ) : receipts.map((r) => {
                    const dateLabel = r.receipt_date
                        ? new Date(r.receipt_date + "T00:00:00").toLocaleDateString("en-AU", { dateStyle: "medium" })
                        : null;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedReceipt(r)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <ReceiptIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{r.vendor_name || "Untitled receipt"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {[dateLabel, r.category].filter(Boolean).join(" · ") || "—"}
                                    </p>
                                </div>
                            </div>
                            <span className="font-semibold">
                                {r.amount != null ? `$${Number(r.amount).toFixed(2)}` : "—"}
                            </span>
                        </button>
                    );
                })}
            </section>

            {/* Timesheets */}
            <section className="space-y-2 px-1">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-base font-semibold text-foreground">Timesheets</p>
                    <Button size="sm" onClick={onOpenCreateTimesheet}>
                        <PlusIcon className="w-3.5 h-3.5 mr-1" />
                        Add Timesheet
                    </Button>
                </div>
                {timesheets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No timesheets yet</p>
                ) : timesheets.map((t) => {
                    const start = new Date(t.start_at);
                    const end = t.end_at ? new Date(t.end_at) : null;
                    const dateLabel = start.toLocaleDateString("en-AU", { dateStyle: "medium" });
                    const timeLabel = end
                        ? `${start.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`
                        : "Running…";
                    const ms = end ? Math.max(0, end.getTime() - start.getTime()) : 0;
                    const name = t.user?.full_name || t.user?.email || "Unknown";
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTimesheet(t)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <ClockIcon className="w-5 h-5 text-sky-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {[dateLabel, timeLabel].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                            </div>
                            <span className="font-semibold tabular-nums">
                                {end ? formatDuration(ms) : <span className="text-emerald-600">running</span>}
                            </span>
                        </button>
                    );
                })}
            </section>

            <ReceiptSideSheet
                receipt={selectedReceipt}
                open={!!selectedReceipt}
                onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}
                onUpdate={() => mutate(`/api/receipts?job_id=${jobId}`)}
            />
            <PurchaseOrderSideSheet
                purchaseOrder={selectedPo}
                open={!!selectedPo}
                onOpenChange={(open) => { if (!open) setSelectedPo(null); }}
                onUpdate={() => mutate(`/api/purchase-orders?job_id=${jobId}`)}
            />
            <TimesheetSideSheet
                timesheet={selectedTimesheet}
                open={!!selectedTimesheet}
                onOpenChange={(open) => { if (!open) setSelectedTimesheet(null); }}
                onUpdate={() => mutate(`/api/timesheets?job_id=${jobId}`)}
            />
        </div>
    );
}
