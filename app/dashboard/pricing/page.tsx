"use client";

import { useState, useRef } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconChevronLeft as ChevronLeftIcon, IconChevronRight as ChevronRightIcon } from "@tabler/icons-react";
import { usePricing } from "@/lib/swr";
import { PricingSideSheet } from "@/components/sheets/PricingSideSheet";
import { CreateMaterialModal } from "@/components/modals/CreateMaterialModal";
import { IconPlus as PlusIcon } from "@tabler/icons-react";

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

const PAGE_SIZE = 20;

export default function PricingPage() {
    usePageTitle("Materials"); // Route is /pricing but display name is "Materials"
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [tradeFilter, setTradeFilter] = useState<string>("All");
    const [page, setPage] = useState(0);
    const [selectedItem, setSelectedItem] = useState<PricingItem | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const { data, isLoading } = usePricing(
        debouncedSearch || undefined,
        tradeFilter !== "All" ? tradeFilter : undefined,
        page * PAGE_SIZE,
        PAGE_SIZE
    );
    const items: PricingItem[] = data?.items || [];
    const total: number = data?.total || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    };

    return (
        <>
        <ScrollableTableLayout
            header={
                <>
                    <DashboardControls>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 min-w-[320px] max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search item, trade, category..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={() => setCreateOpen(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Material
                        </Button>
                    </DashboardControls>
                </>
            }
            footer={totalPages > 1 ? (
                <div className="flex items-center justify-between px-4 md:px-6 lg:px-10 py-3 border-t border-border/50 bg-background">
                    <span className="text-xs text-muted-foreground">
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {page + 1} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : undefined}
        >
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-10">Loading pricing data...</div>
            ) : (
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Description</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " px-4"}>Trade</th>
                            <th className={tableHeadCell + " px-4 hidden md:table-cell"}>UOM</th>
                            <th className={tableHeadCell + " px-4 text-right hidden md:table-cell"}>Material</th>
                            <th className={tableHeadCell + " px-4 text-right hidden lg:table-cell"}>Labour</th>
                            <th className={tableHeadCell + " px-4 text-right"}>Total Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr
                                key={item.Matrix_ID || i}
                                className={tableRow + " cursor-pointer"}
                                onClick={() => { setSelectedItem(item); setSheetOpen(true); }}
                            >
                                <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                    <span className="font-semibold text-sm">{item.Item || "—"}</span>
                                </td>
                                <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                    {item.Pricing_Status && (
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                item.Pricing_Status === "Verified" ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground">{item.Pricing_Status}</span>
                                        </div>
                                    )}
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50">
                                        {item.Trade || "—"}
                                    </Badge>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                    {item.UOM || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 text-right hidden md:table-cell"}>
                                    {item.Material_Cost || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 text-right hidden lg:table-cell"}>
                                    {item.Labour_Cost || "—"}
                                </td>
                                <td className={tableCell + " px-4 text-right"}>
                                    <span className="font-bold text-sm">{item.Total_Rate || "—"}</span>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                                    No pricing items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </ScrollableTableLayout>

            <PricingSideSheet
                item={selectedItem}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />

            <CreateMaterialModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={() => {
                    setPage(0);
                    setDebouncedSearch(search);
                }}
            />
        </>
    );
}
