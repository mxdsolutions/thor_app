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
import { cn, formatCurrency } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";

type Product = {
    id: string;
    name: string;
    description: string | null;
    initial_value: number | null;
    monthly_value: number | null;
    yearly_value: number | null;
    status: string;
    created_at: string;
};

interface ProductSideSheetProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProductSideSheet({ product, open, onOpenChange }: ProductSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        if (product?.id) setActiveTab("details");
    }, [product?.id]);

    if (!product) return null;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-xl text-foreground ring-1 ring-border/50 shrink-0 mt-0.5">
                            {product.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-xl font-bold truncate">{product.name}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full mr-1.5",
                                        product.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    {product.status}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1 truncate">
                                {product.description || "Product"}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs + Content */}
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
                                        { label: "Name", value: product.name },
                                        { label: "Description", value: product.description },
                                        { label: "Initial Value", value: formatCurrency(product.initial_value) },
                                        { label: "Monthly Value", value: formatCurrency(product.monthly_value) },
                                        { label: "Yearly Value", value: formatCurrency(product.yearly_value) },
                                        { label: "Status", value: product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : null },
                                        { label: "Created", value: new Date(product.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                                    ]} />
                                </div>
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="product" entityId={product.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="product" entityId={product.id} />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
