"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields } from "./DetailFields";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { createClient } from "@/lib/supabase/client";
import { IconCurrencyDollar as CurrencyDollarIcon } from "@tabler/icons-react";

type PricingItem = {
    Matrix_ID: string | null;
    Trade: string | null;
    Category: string | null;
    Item: string | null;
    UOM: string | null;
    Total_Rate: string | null;
    Material_Cost: string | null;
    Labour_Cost: string | null;
    Pricing_Status: string | null;
};

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
        const supabase = createClient();
        const { error } = await supabase
            .from("pricing")
            .update({ [column]: value })
            .eq("Matrix_ID", data.Matrix_ID);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

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
