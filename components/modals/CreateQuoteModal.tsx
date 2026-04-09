"use client";

import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrashIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { InlineNumberInput } from "@/features/line-items/InlineNumberInput";
import { formatCurrency } from "@/lib/utils";

const CreateContactModal = lazy(() =>
    import("./CreateContactModal").then(mod => ({ default: mod.CreateContactModal }))
);

interface CreateQuoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (quote: Record<string, unknown>) => void;
    defaultValues?: { contactId?: string; companyId?: string; jobId?: string };
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

type ServiceItem = {
    id: string;
    name: string;
    initial_value: number | null;
};

type QuoteLineItem = {
    pricing_matrix_id: string | null;
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

export function CreateQuoteModal({ open, onOpenChange, onCreated, defaultValues }: CreateQuoteModalProps) {
    const [saving, setSaving] = useState(false);

    const defaultValidUntil = () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
    };

    // Quote fields
    const [description, setDescription] = useState("");
    const [validUntil, setValidUntil] = useState(defaultValidUntil());
    const [materialMargin, setMaterialMargin] = useState(20);
    const [labourMargin, setLabourMargin] = useState(20);
    const [gstInclusive, setGstInclusive] = useState(true);

    // Contact
    const [contacts, setContacts] = useState<ContactOption[]>([]);
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);

    // Company (auto-filled from contact)
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [companyId, setCompanyId] = useState("");

    // Services (preloaded — small dataset)
    const [services, setServices] = useState<ServiceItem[]>([]);

    // Pricing search (API-backed — large dataset)
    const [pricingSearch, setPricingSearch] = useState("");
    const [pricingResults, setPricingResults] = useState<PricingItem[]>([]);
    const [showPricingDropdown, setShowPricingDropdown] = useState(false);
    const [pricingLoading, setPricingLoading] = useState(false);
    const pricingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Line items
    const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);

    const refreshContacts = useCallback(() => {
        fetch("/api/contacts?limit=200")
            .then(r => r.json())
            .then(d => setContacts(d.items || []))
            .catch(() => {});
    }, []);

    // Load contacts + companies on open, then apply defaults
    useEffect(() => {
        if (open) {
            fetch("/api/contacts?limit=200")
                .then(r => r.json())
                .then(d => {
                    setContacts(d.items || []);
                    if (defaultValues?.contactId) setContactId(defaultValues.contactId);
                })
                .catch(() => {});
            fetch("/api/companies")
                .then(r => r.json())
                .then(d => {
                    setCompanies(d.items || []);
                    if (defaultValues?.companyId) setCompanyId(defaultValues.companyId);
                })
                .catch(() => {});
            fetch("/api/services?limit=200")
                .then(r => r.json())
                .then(d => setServices(d.items || []))
                .catch(() => {});
        }
    }, [open]);

    // Debounced pricing search (150ms — trigram index makes DB queries fast)
    const searchPricing = useCallback((query: string) => {
        if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
        if (query.length < 2) {
            setPricingResults([]);
            return;
        }
        setPricingLoading(true);
        pricingDebounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/pricing?search=${encodeURIComponent(query)}&limit=20`);
                const data = await res.json();
                setPricingResults(data.items || []);
            } catch {
                setPricingResults([]);
            } finally {
                setPricingLoading(false);
            }
        }, 150);
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
        setValidUntil(defaultValidUntil());
        setMaterialMargin(20);
        setLabourMargin(20);
        setGstInclusive(true);
        setContactId("");
        setContactSearch("");
        setCompanyId("");
        setPricingSearch("");
        setLineItems([]);
    };

    const filteredServices = useMemo(() => {
        if (pricingSearch.length < 2) return [];
        const q = pricingSearch.toLowerCase();
        return services.filter(s => s.name.toLowerCase().includes(q));
    }, [pricingSearch, services]);

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

    const addServiceItem = (svc: ServiceItem) => {
        setLineItems(prev => [
            ...prev,
            {
                pricing_matrix_id: null,
                description: svc.name,
                trade: "Service",
                uom: "each",
                quantity: 1,
                material_cost: 0,
                labour_cost: svc.initial_value || 0,
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
                    job_id: defaultValues?.jobId || null,
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
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>New Quote</DialogTitle>
                    <DialogDescription>Build a quote from the pricing matrix.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-1 flex-1">
                    {/* Header fields: Contact, Valid Until */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Contact selector with search + create */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Contact</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search or create contact..."
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
                                        {filteredContacts.length === 0 && !contactSearch && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Type to search contacts</div>
                                        )}
                                        {filteredContacts.length === 0 && contactSearch && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                                        )}
                                        {filteredContacts.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl"
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
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border rounded-b-xl"
                                            onClick={() => {
                                                setShowContactDropdown(false);
                                                setShowCreateContact(true);
                                            }}
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            Create new contact{contactSearch ? `: "${contactSearch}"` : ""}
                                        </button>
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
                            <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
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
                        <label className="text-sm font-medium text-muted-foreground">Add Line Items</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search materials or services..."
                                value={pricingSearch}
                                onChange={(e) => {
                                    setPricingSearch(e.target.value);
                                    searchPricing(e.target.value);
                                    setShowPricingDropdown(e.target.value.length >= 2);
                                }}
                                onFocus={() => { if (pricingSearch.length >= 2) setShowPricingDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowPricingDropdown(false), 200)}
                                className="rounded-xl pl-9"
                            />
                            {showPricingDropdown && (
                                <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto">
                                    {pricingLoading && filteredServices.length === 0 && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                                    )}

                                    {/* Services section */}
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
                                                    onClick={() => addServiceItem(svc)}
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

                                    {/* Materials section */}
                                    {pricingResults.length > 0 && (
                                        <>
                                            <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/40 border-b border-border/50">
                                                Materials
                                            </div>
                                            {pricingResults.map((item) => (
                                                <button
                                                    key={item.Matrix_ID}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
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
                                        </>
                                    )}

                                    {!pricingLoading && pricingResults.length === 0 && filteredServices.length === 0 && pricingSearch.length >= 2 && (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="text-left px-4 py-2.5 text-sm font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                                    <th className="text-right px-4 py-2.5 text-sm font-medium text-muted-foreground uppercase tracking-wider w-[88px]">Qty</th>
                                    <th className="text-right px-4 py-2.5 text-sm font-medium text-muted-foreground uppercase tracking-wider w-28">Material</th>
                                    <th className="text-right px-4 py-2.5 text-sm font-medium text-muted-foreground uppercase tracking-wider w-28">Labour</th>
                                    <th className="text-right px-4 py-2.5 text-sm font-medium text-muted-foreground uppercase tracking-wider w-28">Total</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                        </table>
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                    {lineItems.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                Search and add materials or services above
                                            </td>
                                        </tr>
                                    )}
                                    {lineItems.map((li, idx) => {
                                        const lineTotal = li.quantity * (li.material_cost + li.labour_cost);
                                        return (
                                            <tr key={idx} className="border-b border-border/50 last:border-0">
                                                <td className="px-4 py-3 font-medium">{li.description}</td>
                                                <td className="px-4 py-3 text-right w-[88px]">
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
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
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

        {showCreateContact && (
            <Suspense fallback={null}>
                <CreateContactModal
                    open={showCreateContact}
                    onOpenChange={setShowCreateContact}
                    onCreated={(contact) => {
                        refreshContacts();
                        setContactId(contact.id);
                        setContactSearch("");
                        if (contact.company_id) setCompanyId(contact.company_id);
                    }}
                />
            </Suspense>
        )}
        </>
    );
}
