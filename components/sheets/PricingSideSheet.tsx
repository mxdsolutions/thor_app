"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields } from "./DetailFields";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { IconCurrencyDollar as CurrencyDollarIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import type { PricingItem } from "@/lib/swr";

interface PricingSideSheetProps {
    item: PricingItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function PricingSideSheet({ item, open, onOpenChange, onUpdate }: PricingSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<PricingItem | null>(item);

    useEffect(() => { setData(item); }, [item]);
    useEffect(() => { if (data?.Matrix_ID) setActiveTab("details"); }, [data?.Matrix_ID]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data?.Matrix_ID) return;
        const res = await fetch("/api/pricing", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Matrix_ID: data.Matrix_ID, [column]: value }),
        });
        if (res.ok) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update field");
        }
    }, [data, onUpdate]);

    const archive = useArchiveAction({
        entityName: "pricing item",
        endpoint: data?.Matrix_ID ? `/api/pricing/${encodeURIComponent(data.Matrix_ID)}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    if (!data) return null;

    const isVerified = data.Pricing_Status === "Verified";

    const tabs = [
        { id: "details", label: "Details" },
        { id: "breakdown", label: "Cost Breakdown" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<CurrencyDollarIcon className="w-7 h-7 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
            title={data.Item || "—"}
            subtitle={[data.Trade, data.Category].filter(Boolean).join(" · ") || "Pricing item"}
            badge={{
                label: data.Pricing_Status || "Unknown",
                dotColor: isVerified ? "bg-emerald-500" : "bg-amber-500",
            }}
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
                                { label: "Item", value: data.Item, dbColumn: "Item", type: "text", rawValue: data.Item },
                                { label: "Trade", value: data.Trade, dbColumn: "Trade", type: "text", rawValue: data.Trade },
                                { label: "Category", value: data.Category, dbColumn: "Category", type: "text", rawValue: data.Category },
                                { label: "Unit of Measure", value: data.UOM, dbColumn: "UOM", type: "text", rawValue: data.UOM },
                                { label: "Total Rate", value: data.Total_Rate, dbColumn: "Total_Rate", type: "text", rawValue: data.Total_Rate },
                                { label: "Status", value: data.Pricing_Status, dbColumn: "Pricing_Status", type: "select", rawValue: data.Pricing_Status, options: [{ value: "Verified", label: "Verified" }, { value: "Unverified", label: "Unverified" }] },
                                { label: "Matrix ID", value: data.Matrix_ID },
                            ]}
                        />
                    </div>
                </div>
            )}

            {activeTab === "breakdown" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "Material Cost", value: data.Material_Cost || "—", dbColumn: "Material_Cost", type: "text", rawValue: data.Material_Cost },
                                { label: "Labour Cost", value: data.Labour_Cost || "—", dbColumn: "Labour_Cost", type: "text", rawValue: data.Labour_Cost },
                                { label: "Total Rate", value: data.Total_Rate || "—" },
                            ]}
                        />
                    </div>
                </div>
            )}
        </SideSheetLayout>
    );
}
