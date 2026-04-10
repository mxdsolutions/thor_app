"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTrash as TrashIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { InlineNumberInput } from "./InlineNumberInput";

type Service = {
    id: string;
    name: string;
    initial_value: number | null;
};

// Live mode: items managed via API callbacks
type LiveLineItem = {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product: { id: string; name: string } | null;
};

// Draft mode: items managed locally by parent
type DraftLineItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
};

type LiveModeProps = {
    mode: "live";
    items: LiveLineItem[];
    services: Service[];
    onAdd: (productId: string, quantity: number, unitPrice: number) => Promise<void>;
    onUpdate: (id: string, field: "quantity" | "unit_price", value: number) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
};

type DraftModeProps = {
    mode: "draft";
    items: DraftLineItem[];
    services: Service[];
    onItemsChange: (items: DraftLineItem[]) => void;
};

type LineItemsTableProps = LiveModeProps | DraftModeProps;

export function LineItemsTable(props: LineItemsTableProps) {
    const { mode, services } = props;
    const [addingService, setAddingService] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [newQty, setNewQty] = useState(1);
    const [newUnitPrice, setNewUnitPrice] = useState(0);

    const items = props.items;
    const total = items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

    const resetAddRow = () => {
        setAddingService(false);
        setSelectedServiceId("");
        setNewQty(1);
        setNewUnitPrice(0);
    };

    const handleAdd = async () => {
        if (!selectedServiceId) return;

        if (mode === "live") {
            await props.onAdd(selectedServiceId, newQty, newUnitPrice);
        } else {
            const svc = services.find(s => s.id === selectedServiceId);
            props.onItemsChange([
                ...props.items,
                {
                    product_id: selectedServiceId,
                    product_name: svc?.name || "Unknown",
                    quantity: newQty,
                    unit_price: newUnitPrice,
                },
            ]);
        }
        resetAddRow();
    };

    const handleServiceSelect = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        const svc = services.find(s => s.id === serviceId);
        if (svc?.initial_value) setNewUnitPrice(svc.initial_value);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Qty</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Unit Price</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Total</th>
                            <th className="w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && !addingService && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                    No services added yet
                                </td>
                            </tr>
                        )}

                        {mode === "live" && (props as LiveModeProps).items.map((li) => (
                            <tr key={li.id} className="border-b border-border/50 last:border-0">
                                <td className="px-4 py-3 font-medium">{li.product?.name || "Unknown"}</td>
                                <td className="px-4 py-3 text-right">
                                    <InlineNumberInput
                                        value={li.quantity}
                                        onSave={(v) => (props as LiveModeProps).onUpdate(li.id, "quantity", v)}
                                    />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <InlineNumberInput
                                        value={li.unit_price}
                                        onSave={(v) => (props as LiveModeProps).onUpdate(li.id, "unit_price", v)}
                                        prefix="$"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    ${(li.quantity * li.unit_price).toLocaleString()}
                                </td>
                                <td className="px-2 py-3">
                                    <button
                                        onClick={() => (props as LiveModeProps).onDelete(li.id)}
                                        className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {mode === "draft" && (props as DraftModeProps).items.map((li, idx) => (
                            <tr key={idx} className="border-b border-border/50 last:border-0">
                                <td className="px-4 py-3 font-medium">{li.product_name}</td>
                                <td className="px-4 py-3 text-right">
                                    <InlineNumberInput
                                        value={li.quantity}
                                        onSave={(v) => {
                                            const updated = [...(props as DraftModeProps).items];
                                            updated[idx] = { ...updated[idx], quantity: v };
                                            (props as DraftModeProps).onItemsChange(updated);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <InlineNumberInput
                                        value={li.unit_price}
                                        onSave={(v) => {
                                            const updated = [...(props as DraftModeProps).items];
                                            updated[idx] = { ...updated[idx], unit_price: v };
                                            (props as DraftModeProps).onItemsChange(updated);
                                        }}
                                        prefix="$"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    ${(li.quantity * li.unit_price).toLocaleString()}
                                </td>
                                <td className="px-2 py-3">
                                    <button
                                        onClick={() => {
                                            const updated = (props as DraftModeProps).items.filter((_, i) => i !== idx);
                                            (props as DraftModeProps).onItemsChange(updated);
                                        }}
                                        className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {addingService && (
                            <tr className="border-b border-border/50">
                                <td className="px-4 py-3">
                                    <select
                                        className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={selectedServiceId}
                                        onChange={(e) => handleServiceSelect(e.target.value)}
                                        autoFocus
                                    >
                                        <option value="">Select service...</option>
                                        {services.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        min={0}
                                        value={newQty}
                                        onChange={(e) => setNewQty(Number(e.target.value))}
                                        className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={newUnitPrice}
                                        onChange={(e) => setNewUnitPrice(Number(e.target.value))}
                                        className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums text-muted-foreground">
                                    ${(newQty * newUnitPrice).toLocaleString()}
                                </td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                    {(items.length > 0 || addingService) && (
                        <tfoot>
                            <tr className="border-t border-border bg-secondary/20">
                                <td colSpan={3} className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums">${total.toLocaleString()}</td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {addingService ? (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="rounded-full"
                        disabled={!selectedServiceId}
                        onClick={handleAdd}
                    >
                        Add
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={resetAddRow}
                    >
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setAddingService(true)}
                >
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    Add Service
                </Button>
            )}
        </div>
    );
}
