"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { usePricing, type PricingItem } from "@/lib/swr";
import { PricingSideSheet } from "@/components/sheets/PricingSideSheet";
import { CreateMaterialModal } from "@/components/modals/CreateMaterialModal";

type PricingRow = PricingItem & { id: string };

const columns: DataTableColumn<PricingRow>[] = [
    { key: "item", label: "Description", render: (p) => <span className="font-semibold">{p.Item || "—"}</span> },
    {
        key: "status",
        label: "Status",
        className: "hidden sm:table-cell",
        render: (p) => p.Pricing_Status ? (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", p.Pricing_Status === "Verified" ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="font-medium text-muted-foreground">{p.Pricing_Status}</span>
            </div>
        ) : null,
    },
    {
        key: "trade",
        label: "Trade",
        render: (p) => (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50">
                {p.Trade || "—"}
            </Badge>
        ),
    },
    { key: "uom", label: "UOM", muted: true, className: "hidden md:table-cell", render: (p) => p.UOM || "—" },
    { key: "material", label: "Material", muted: true, className: "text-right hidden md:table-cell", render: (p) => p.Material_Cost || "—" },
    { key: "labour", label: "Labour", muted: true, className: "text-right hidden lg:table-cell", render: (p) => p.Labour_Cost || "—" },
    { key: "total", label: "Total Rate", className: "text-right", render: (p) => <span className="font-bold">{p.Total_Rate || "—"}</span> },
];

const PAGE_SIZE = 20;

export default function PricingPage() {
    usePageTitle("Materials");
    const [createOpen, setCreateOpen] = useState(false);
    useMobileHeaderAction(useCallback(() => setCreateOpen(true), []));
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(0);
    const [selectedItem, setSelectedItem] = useState<PricingItem | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const { data, isLoading } = usePricing(debouncedSearch || undefined, undefined, page * PAGE_SIZE, PAGE_SIZE);
    const total: number = data?.total || 0;

    // pg_trgm needs 3+ chars to use the GIN indexes
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            () => setDebouncedSearch(value.length >= 3 ? value : ""),
            300,
        );
    };

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    // Normalize PricingItem to have an `id` field for DataTable
    const rows: PricingRow[] = useMemo(
        () => (data?.items || [] as PricingItem[]).map((item: PricingItem, i: number) => ({ ...item, id: item.Matrix_ID || String(i) })),
        [data?.items],
    );

    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search item, trade, category..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="hidden md:inline-flex" onClick={() => setCreateOpen(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Material
                        </Button>
                    </DashboardControls>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={rows}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No pricing items found."
                    onRowClick={(row) => { setSelectedItem(row); setSheetOpen(true); }}
                />
            </ScrollableTableLayout>

            <PricingSideSheet
                item={selectedItem}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />

            <CreateMaterialModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={() => { setPage(0); setDebouncedSearch(search); }}
            />
        </>
    );
}
