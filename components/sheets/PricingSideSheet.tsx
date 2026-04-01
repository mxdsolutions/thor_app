"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

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
}

export function PricingSideSheet({ item, open, onOpenChange }: PricingSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        if (item?.Matrix_ID) setActiveTab("details");
    }, [item?.Matrix_ID]);

    if (!item) return null;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "breakdown", label: "Cost Breakdown" },
    ];

    const isVerified = item.Pricing_Status === "Verified";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center ring-1 ring-border/50 shrink-0 mt-0.5">
                            <CurrencyDollarIcon className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <SheetTitle className="text-xl font-bold truncate">{item.Item || "—"}</SheetTitle>
                                {item.Pricing_Status && (
                                    <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full mr-1.5",
                                            isVerified ? "bg-emerald-500" : "bg-amber-500"
                                        )} />
                                        {item.Pricing_Status}
                                    </Badge>
                                )}
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                {[item.Trade, item.Category].filter(Boolean).join(" · ") || "Pricing item"}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "details" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields fields={[
                                        { label: "Item", value: item.Item },
                                        { label: "Trade", value: item.Trade },
                                        { label: "Category", value: item.Category },
                                        { label: "Unit of Measure", value: item.UOM },
                                        { label: "Total Rate", value: item.Total_Rate },
                                        { label: "Status", value: item.Pricing_Status },
                                        { label: "Matrix ID", value: item.Matrix_ID },
                                    ]} />
                                </div>
                            </div>
                        )}

                        {activeTab === "breakdown" && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground">Cost Breakdown</h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: "Material Cost", value: item.Material_Cost, color: "bg-blue-500" },
                                            { label: "Labour Cost", value: item.Labour_Cost, color: "bg-violet-500" },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                                                    <span className="text-sm text-muted-foreground">{label}</span>
                                                </div>
                                                <span className="text-sm font-semibold tabular-nums">{value || "—"}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-sm font-semibold text-foreground">Total Rate</span>
                                            <span className="text-sm font-bold text-foreground tabular-nums">{item.Total_Rate || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
