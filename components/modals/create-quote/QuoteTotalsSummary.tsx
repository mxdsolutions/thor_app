"use client";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface Props {
    materialSum: number;
    labourSum: number;
    gst: number;
    grandTotal: number;
    materialMargin: number;
    setMaterialMargin: (v: number) => void;
    labourMargin: number;
    setLabourMargin: (v: number) => void;
    gstInclusive: boolean;
    setGstInclusive: (v: boolean) => void;
}

export function QuoteTotalsSummary({
    materialSum,
    labourSum,
    gst,
    grandTotal,
    materialMargin,
    setMaterialMargin,
    labourMargin,
    setLabourMargin,
    gstInclusive,
    setGstInclusive,
}: Props) {
    return (
        <div className="flex justify-end">
            <div className="w-full sm:max-w-[50%] rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Materials subtotal</span>
                        <span className="tabular-nums">{formatCurrency(materialSum)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Labour subtotal</span>
                        <span className="tabular-nums">{formatCurrency(labourSum)}</span>
                    </div>
                </div>

                <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Material margin</label>
                        <div className="relative">
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={materialMargin}
                                onChange={(e) => setMaterialMargin(Number(e.target.value) || 0)}
                                className="rounded-lg h-8 text-xs pr-7"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Labour margin</label>
                        <div className="relative">
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={labourMargin}
                                onChange={(e) => setLabourMargin(Number(e.target.value) || 0)}
                                className="rounded-lg h-8 text-xs pr-7"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <select
                            value={gstInclusive ? "inclusive" : "exclusive"}
                            onChange={(e) => setGstInclusive(e.target.value === "inclusive")}
                            className="text-xs bg-transparent border border-border rounded-lg px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="inclusive">GST Inclusive</option>
                            <option value="exclusive">GST Exclusive</option>
                        </select>
                        <span className="tabular-nums text-sm">{formatCurrency(gst)}</span>
                    </div>
                </div>

                <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                    <span>Grand Total</span>
                    <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>
            </div>
        </div>
    );
}
