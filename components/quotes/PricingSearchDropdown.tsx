"use client";

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils";
import { useServiceOptions, type PricingItem } from "@/lib/swr";

const CreateMaterialModal = lazy(() =>
    import("@/components/modals/CreateMaterialModal").then(mod => ({ default: mod.CreateMaterialModal }))
);
const CreateServiceModal = lazy(() =>
    import("@/components/modals/CreateServiceModal").then(mod => ({ default: mod.CreateServiceModal }))
);

type ServiceItem = {
    id: string;
    name: string;
    initial_value: number | null;
};

function parseNum(val: string | null | undefined): number {
    if (!val) return 0;
    const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
}

export type NewLineItem = {
    pricing_matrix_id: string | null;
    description: string;
    line_description: string;
    trade: string;
    uom: string;
    quantity: number;
    material_cost: number;
    labour_cost: number;
};

interface PricingSearchDropdownProps {
    /** Whether the parent modal is open (controls SWR fetching) */
    enabled: boolean;
    /** Placeholder hint showing which section items go into */
    activeSectionName?: string | null;
    /** Called when a pricing/service item is selected or created */
    onAddItem: (item: NewLineItem) => void;
}

/**
 * Shared pricing/service search with debounced API search, service filtering,
 * and "Create new material/service" options. Used by both Create and Edit quote modals.
 */
export function PricingSearchDropdown({ enabled, activeSectionName, onAddItem }: PricingSearchDropdownProps) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<PricingItem[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);

    const [showCreateMaterial, setShowCreateMaterial] = useState(false);
    const [showCreateService, setShowCreateService] = useState(false);

    const { data: servicesData } = useServiceOptions(enabled);
    const services: ServiceItem[] = useMemo(() => servicesData?.items ?? [], [servicesData]);

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    const doSearch = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.length < 3) { setResults([]); setLoading(false); return; }
        setLoading(true);
        const id = ++requestIdRef.current;
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/pricing?search=${encodeURIComponent(query)}&limit=20`);
                const data = await res.json();
                if (id !== requestIdRef.current) return;
                setResults(data.items || []);
            } catch {
                if (id !== requestIdRef.current) return;
                setResults([]);
            } finally {
                if (id === requestIdRef.current) setLoading(false);
            }
        }, 150);
    }, []);

    const filteredServices = useMemo(() => {
        if (search.length < 3) return [];
        const q = search.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q));
    }, [search, services]);

    const handleSelectPricing = (item: PricingItem) => {
        onAddItem({
            pricing_matrix_id: item.Matrix_ID,
            description: item.Item || "Unknown Item",
            line_description: "",
            trade: item.Trade || "",
            uom: item.UOM || "",
            quantity: 1,
            material_cost: parseNum(item.Material_Cost),
            labour_cost: parseNum(item.Labour_Cost),
        });
        setSearch("");
        setShowDropdown(false);
    };

    const handleSelectService = (svc: ServiceItem) => {
        onAddItem({
            pricing_matrix_id: null,
            description: svc.name,
            line_description: "",
            trade: "Service",
            uom: "each",
            quantity: 1,
            material_cost: 0,
            labour_cost: svc.initial_value || 0,
        });
        setSearch("");
        setShowDropdown(false);
    };

    const placeholder = activeSectionName
        ? `Search materials — adding to "${activeSectionName}"`
        : "Search materials or services...";

    return (
        <>
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        doSearch(e.target.value);
                        setShowDropdown(e.target.value.length >= 3);
                    }}
                    onFocus={() => { if (search.length >= 3) setShowDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="rounded-xl pl-9"
                />
                {showDropdown && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg flex flex-col max-h-72">
                        {/* Scrollable results */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {loading && filteredServices.length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                            )}

                            {filteredServices.length > 0 && (
                                <>
                                    <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/40 border-b border-border/50">
                                        Services
                                    </div>
                                    {filteredServices.map(svc => (
                                        <button
                                            key={svc.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                            onClick={() => handleSelectService(svc)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium truncate">{svc.name}</span>
                                                {svc.initial_value != null && (
                                                    <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(svc.initial_value)}</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {results.length > 0 && (
                                <>
                                    <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/40 border-b border-border/50">
                                        Materials
                                    </div>
                                    {results.map((item) => (
                                        <button
                                            key={item.Matrix_ID}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                            onClick={() => handleSelectPricing(item)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium truncate block">{item.Item}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {item.Trade}{item.Category ? ` / ${item.Category}` : ""}{item.UOM ? ` (${item.UOM})` : ""}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground text-right shrink-0">
                                                    <div>Mat: {formatCurrency(parseNum(item.Material_Cost))}</div>
                                                    <div>Lab: {formatCurrency(parseNum(item.Labour_Cost))}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {!loading && results.length === 0 && filteredServices.length === 0 && search.length >= 3 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                            )}
                        </div>

                        {/* Sticky create buttons — always visible at bottom */}
                        <div className="border-t border-border/50 shrink-0 bg-background rounded-b-xl">
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
                                onClick={() => { setShowDropdown(false); setShowCreateMaterial(true); }}
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Create new material{search.length >= 3 ? `: "${search}"` : ""}
                            </button>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 rounded-b-xl"
                                onClick={() => { setShowDropdown(false); setShowCreateService(true); }}
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Create new service{search.length >= 3 ? `: "${search}"` : ""}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showCreateMaterial && (
                <Suspense fallback={null}>
                    <CreateMaterialModal
                        open={showCreateMaterial}
                        onOpenChange={setShowCreateMaterial}
                        onCreated={(item) => {
                            onAddItem({
                                pricing_matrix_id: (item as { Matrix_ID?: string }).Matrix_ID || null,
                                description: String((item as { Item?: string }).Item || "New Material"),
                                line_description: "",
                                trade: String((item as { Trade?: string }).Trade || ""),
                                uom: String((item as { UOM?: string }).UOM || ""),
                                quantity: 1,
                                material_cost: parseNum(String((item as { Material_Cost?: string }).Material_Cost)),
                                labour_cost: parseNum(String((item as { Labour_Cost?: string }).Labour_Cost)),
                            });
                        }}
                    />
                </Suspense>
            )}

            {showCreateService && (
                <Suspense fallback={null}>
                    <CreateServiceModal
                        open={showCreateService}
                        onOpenChange={setShowCreateService}
                        onCreated={(service) => {
                            onAddItem({
                                pricing_matrix_id: null,
                                description: service.name,
                                line_description: "",
                                trade: "Service",
                                uom: "each",
                                quantity: 1,
                                material_cost: 0,
                                labour_cost: 0,
                            });
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
