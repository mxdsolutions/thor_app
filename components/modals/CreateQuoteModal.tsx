"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { InlineNumberInput } from "@/features/line-items/InlineNumberInput";
import { formatCurrency } from "@/lib/utils";
import { QuoteHeader } from "@/components/quotes/QuoteHeader";

interface CreateQuoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (quote: Record<string, unknown>) => void;
}

type ContactOption = { id: string; first_name: string; last_name: string; email: string | null; company_id: string | null; company?: { id: string; name: string } | null };
type CompanyOption = { id: string; name: string };

type PricingItem = {
    Matrix_ID: string;
    Item: string;
    Trade: string | null;
    Category: string | null;
    UOM: string | null;
    Total_Rate: string | null;
    Material_Cost: string | null;
    Labour_Cost: string | null;
};

type QuoteLineItem = {
    pricing_matrix_id: string;
    description: string;
    trade: string;
    uom: string;
    quantity: number;
    material_cost: number;
    labour_cost: number;
};

function parseNum(val: string | null | undefined): number {
    if (!val) return 0;
    const n = parseFloat(val.replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
}

const GST_RATE = 0.1;

export function CreateQuoteModal({ open, onOpenChange, onCreated }: CreateQuoteModalProps) {
    const [saving, setSaving] = useState(false);

    // Quote fields
    const [description, setDescription] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [materialMargin, setMaterialMargin] = useState(20);
    const [labourMargin, setLabourMargin] = useState(20);
    const [gstInclusive, setGstInclusive] = useState(true);

    // Contact
    const [contacts, setContacts] = useState<ContactOption[]>([]);
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    // Company (auto-filled from contact)
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [companyId, setCompanyId] = useState("");

    // Pricing search
    const [pricingSearch, setPricingSearch] = useState("");
    const [pricingResults, setPricingResults] = useState<PricingItem[]>([]);
    const [showPricingDropdown, setShowPricingDropdown] = useState(false);
    const [pricingLoading, setPricingLoading] = useState(false);
    const pricingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Line items
    const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);

    // Load contacts + companies on open
    useEffect(() => {
        if (open) {
            fetch("/api/contacts?limit=200")
                .then(r => r.json())
                .then(d => setContacts(d.contacts || []))
                .catch(() => {});
            fetch("/api/companies")
                .then(r => r.json())
                .then(d => setCompanies(d.companies || []))
                .catch(() => {});
        }
    }, [open]);

    // Debounced pricing search
    const searchPricing = useCallback((query: string) => {
        if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
        if (query.length < 2) {
            setPricingResults([]);
            setShowPricingDropdown(false);
            return;
        }
        setPricingLoading(true);
        pricingDebounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/pricing?search=${encodeURIComponent(query)}&limit=20`);
                const data = await res.json();
                setPricingResults(data.items || []);
                setShowPricingDropdown(true);
            } catch {
                setPricingResults([]);
            } finally {
                setPricingLoading(false);
            }
        }, 300);
    }, []);

    const selectedContact = contacts.find(c => c.id === contactId);
    const selectedCompany = companies.find(c => c.id === companyId);
    const filteredContacts = contacts.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(contactSearch.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()));
    });

    // Calculations
    const totals = useMemo(() => {
        let materialSum = 0;
        let labourSum = 0;
        for (const li of lineItems) {
            materialSum += li.quantity * li.material_cost;
            labourSum += li.quantity * li.labour_cost;
        }
        const materialWithMargin = materialSum * (1 + materialMargin / 100);
        const labourWithMargin = labourSum * (1 + labourMargin / 100);
        const subtotal = materialWithMargin + labourWithMargin;
        const gst = gstInclusive ? subtotal / 11 : subtotal * GST_RATE;
        const grandTotal = gstInclusive ? subtotal : subtotal + gst;
        return {
            materialSum,
            labourSum,
            materialWithMargin,
            labourWithMargin,
            subtotal,
            gst,
            grandTotal,
        };
    }, [lineItems, materialMargin, labourMargin, gstInclusive]);

    const reset = () => {
        setDescription("");
        setValidUntil("");
        setMaterialMargin(20);
        setLabourMargin(20);
        setGstInclusive(true);
        setContactId("");
        setContactSearch("");
        setCompanyId("");
        setPricingSearch("");
        setPricingResults([]);
        setLineItems([]);
    };

    const addPricingItem = (item: PricingItem) => {
        setLineItems(prev => [
            ...prev,
            {
                pricing_matrix_id: item.Matrix_ID,
                description: item.Item || "Unknown Item",
                trade: item.Trade || "",
                uom: item.UOM || "",
                quantity: 1,
                material_cost: parseNum(item.Material_Cost),
                labour_cost: parseNum(item.Labour_Cost),
            },
        ]);
        setPricingSearch("");
        setShowPricingDropdown(false);
    };

    const updateLineItem = (idx: number, field: keyof QuoteLineItem, value: number) => {
        setLineItems(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    const removeLineItem = (idx: number) => {
        setLineItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lineItems.length === 0) return;

        setSaving(true);
        try {
            const res = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description.trim() || null,
                    contact_id: contactId || null,
                    company_id: companyId || null,
                    valid_until: validUntil || null,
                    material_margin: materialMargin,
                    labour_margin: labourMargin,
                    gst_inclusive: gstInclusive,
                    line_items: lineItems,
                }),
            });
            if (!res.ok) throw new Error("Failed to create quote");
            const data = await res.json();
            toast.success("Quote created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create quote");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[35%] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>New Quote</DialogTitle>
                    <DialogDescription>Build a quote from the pricing matrix.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-1 flex-1">
                    <QuoteHeader />

                    {/* Header fields: Contact, Company, Valid Until */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Contact selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Contact</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search contact..."
                                    value={selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : contactSearch}
                                    onChange={(e) => {
                                        setContactSearch(e.target.value);
                                        setContactId("");
                                        setShowContactDropdown(true);
                                    }}
                                    onFocus={() => setShowContactDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                                    className="rounded-xl"
                                />
                                {showContactDropdown && !selectedContact && (
                                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredContacts.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                                        )}
                                        {filteredContacts.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                                                onClick={() => {
                                                    setContactId(c.id);
                                                    setContactSearch("");
                                                    setShowContactDropdown(false);
                                                    if (c.company_id) setCompanyId(c.company_id);
                                                }}
                                            >
                                                <span className="font-medium">{c.first_name} {c.last_name}</span>
                                                {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedContact && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => { setContactId(""); setContactSearch(""); setCompanyId(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Company</label>
                            <Input
                                value={selectedCompany?.name || ""}
                                disabled
                                placeholder="Auto-filled from contact"
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Valid Until</label>
                            <Input
                                type="date"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Pricing search */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Add Line Items</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search pricing items by name, trade, or category..."
                                value={pricingSearch}
                                onChange={(e) => {
                                    setPricingSearch(e.target.value);
                                    searchPricing(e.target.value);
                                }}
                                onFocus={() => { if (pricingResults.length > 0) setShowPricingDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowPricingDropdown(false), 200)}
                                className="rounded-xl pl-9"
                            />
                            {showPricingDropdown && (
                                <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                    {pricingLoading && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                                    )}
                                    {!pricingLoading && pricingResults.length === 0 && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                                    )}
                                    {pricingResults.map((item) => (
                                        <button
                                            key={item.Matrix_ID}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                                            onClick={() => addPricingItem(item)}
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
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">UOM</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Qty</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Material $</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Labour $</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Total</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                        </table>
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                    {lineItems.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                Search and add pricing items above
                                            </td>
                                        </tr>
                                    )}
                                    {lineItems.map((li, idx) => {
                                        const lineTotal = li.quantity * (li.material_cost + li.labour_cost);
                                        return (
                                            <tr key={idx} className="border-b border-border/50 last:border-0">
                                                <td className="px-4 py-3 font-medium">{li.description}</td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs w-16">{li.uom}</td>
                                                <td className="px-4 py-3 text-right w-16">
                                                    <InlineNumberInput
                                                        value={li.quantity}
                                                        onSave={(v) => updateLineItem(idx, "quantity", v)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right w-28">
                                                    <InlineNumberInput
                                                        value={li.material_cost}
                                                        onSave={(v) => updateLineItem(idx, "material_cost", v)}
                                                        prefix="$"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right w-28">
                                                    <InlineNumberInput
                                                        value={li.labour_cost}
                                                        onSave={(v) => updateLineItem(idx, "labour_cost", v)}
                                                        prefix="$"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium tabular-nums w-28">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                <td className="px-2 py-3 w-10">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLineItem(idx)}
                                                        className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary */}
                    {lineItems.length > 0 && (
                        <div className="flex justify-end">
                            <div className="w-full max-w-[50%] rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                                {/* Subtotals */}
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Materials subtotal</span>
                                        <span className="tabular-nums">{formatCurrency(totals.materialSum)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Labour subtotal</span>
                                        <span className="tabular-nums">{formatCurrency(totals.labourSum)}</span>
                                    </div>
                                </div>

                                {/* Margin inputs */}
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

                                {/* GST */}
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
                                        <span className="tabular-nums text-sm">{formatCurrency(totals.gst)}</span>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                                    <span>Grand Total</span>
                                    <span className="tabular-nums">{formatCurrency(totals.grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                        <textarea
                            placeholder="Additional notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                            {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
                            {lineItems.length > 0 && <span className="ml-2 font-medium text-foreground">{formatCurrency(totals.grandTotal)}</span>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={lineItems.length === 0 || saving}>
                                {saving ? "Creating..." : "Create Quote"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
