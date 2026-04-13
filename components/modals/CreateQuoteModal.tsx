"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    IconTrash as TrashIcon,
    IconPlus as PlusIcon,
    IconLayoutList as SectionIcon,
    IconChevronUp,
    IconChevronDown,
} from "@tabler/icons-react";
import { InlineNumberInput } from "@/features/line-items/InlineNumberInput";
import { formatCurrency } from "@/lib/utils";
import { useContactOptions } from "@/lib/swr";
import { PricingSearchDropdown, type NewLineItem } from "@/components/quotes/PricingSearchDropdown";

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

type Section = {
    id: string;
    name: string;
    items: NewLineItem[];
};

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
    const [scopeDescription, setScopeDescription] = useState("");
    const [validUntil, setValidUntil] = useState(defaultValidUntil());
    const [materialMargin, setMaterialMargin] = useState(20);
    const [labourMargin, setLabourMargin] = useState(20);
    const [gstInclusive, setGstInclusive] = useState(true);

    // Contact
    const { data: contactsData, mutate: mutateContacts } = useContactOptions(open);
    const contacts: ContactOption[] = useMemo(() => contactsData?.items ?? [], [contactsData]);
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);
    const [companyId, setCompanyId] = useState("");

    // Sections
    const [sections, setSections] = useState<Section[]>([]);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // All items flat (for calculations)
    const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
    const totalItemCount = allItems.length;

    useEffect(() => {
        if (!open) return;
        if (defaultValues?.contactId) setContactId(defaultValues.contactId);
        if (defaultValues?.companyId) setCompanyId(defaultValues.companyId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectedContact = contacts.find(c => c.id === contactId);
    const filteredContacts = contacts.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(contactSearch.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()));
    });

    // Calculations
    const totals = useMemo(() => {
        let materialSum = 0;
        let labourSum = 0;
        for (const li of allItems) {
            materialSum += li.quantity * li.material_cost;
            labourSum += li.quantity * li.labour_cost;
        }
        const materialWithMargin = materialSum * (1 + materialMargin / 100);
        const labourWithMargin = labourSum * (1 + labourMargin / 100);
        const subtotal = materialWithMargin + labourWithMargin;
        const gst = gstInclusive ? subtotal / 11 : subtotal * GST_RATE;
        const grandTotal = gstInclusive ? subtotal : subtotal + gst;
        return { materialSum, labourSum, subtotal, gst, grandTotal };
    }, [allItems, materialMargin, labourMargin, gstInclusive]);

    const reset = () => {
        setDescription("");
        setScopeDescription("");
        setValidUntil(defaultValidUntil());
        setMaterialMargin(20);
        setLabourMargin(20);
        setGstInclusive(true);
        setContactId("");
        setContactSearch("");
        setCompanyId("");
        setSections([]);
        setActiveSectionId(null);
    };

    // Section management
    const addSection = () => {
        const id = crypto.randomUUID();
        const name = `Section ${sections.length + 1}`;
        setSections(prev => [...prev, { id, name, items: [] }]);
        setActiveSectionId(id);
    };

    const updateSectionName = (sectionId: string, name: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name } : s));
    };

    const removeSection = (sectionId: string) => {
        setSections(prev => prev.filter(s => s.id !== sectionId));
        if (activeSectionId === sectionId) {
            setActiveSectionId(sections.length > 1 ? sections.find(s => s.id !== sectionId)?.id ?? null : null);
        }
    };

    const moveSectionUp = (idx: number) => {
        if (idx === 0) return;
        setSections(prev => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const moveSectionDown = (idx: number) => {
        if (idx >= sections.length - 1) return;
        setSections(prev => {
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    // Add item to active section
    const addItemToSection = useCallback((item: NewLineItem) => {
        if (!activeSectionId) {
            const id = crypto.randomUUID();
            setSections([{ id, name: "Section 1", items: [item] }]);
            setActiveSectionId(id);
            return;
        }
        setSections(prev => prev.map(s =>
            s.id === activeSectionId ? { ...s, items: [...s.items, item] } : s
        ));
    }, [activeSectionId]);

    const updateLineItem = (sectionId: string, itemIdx: number, field: keyof NewLineItem, value: number | string) => {
        setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            const items = [...s.items];
            items[itemIdx] = { ...items[itemIdx], [field]: value };
            return { ...s, items };
        }));
    };

    const removeLineItem = (sectionId: string, itemIdx: number) => {
        setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            return { ...s, items: s.items.filter((_, i) => i !== itemIdx) };
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalItemCount === 0) return;

        setSaving(true);
        try {
            const res = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description.trim() || null,
                    scope_description: scopeDescription.trim() || null,
                    contact_id: contactId || null,
                    company_id: companyId || null,
                    job_id: defaultValues?.jobId || null,
                    valid_until: validUntil || null,
                    material_margin: materialMargin,
                    labour_margin: labourMargin,
                    gst_inclusive: gstInclusive,
                    sections: sections.map((s, si) => ({
                        name: s.name,
                        sort_order: si,
                        items: s.items.map((item, ii) => ({
                            ...item,
                            sort_order: ii,
                        })),
                    })),
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
            <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>New Quote</DialogTitle>
                    <DialogDescription>Build a quote from the pricing matrix.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    {/* Non-scrollable top section */}
                    <div className="px-1 space-y-4 pb-4">
                        {/* Header fields: Contact, Valid Until */}
                        <div className="grid grid-cols-2 gap-3">
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

                        {/* Scope description */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Scope / Description</label>
                            <textarea
                                placeholder="Describe the scope of work..."
                                value={scopeDescription}
                                onChange={(e) => setScopeDescription(e.target.value)}
                                rows={2}
                                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        {/* Pricing search + Add Section */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-muted-foreground">Line Items</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg h-7 text-xs gap-1"
                                    onClick={addSection}
                                >
                                    <SectionIcon className="w-3.5 h-3.5" />
                                    Add Section
                                </Button>
                            </div>
                            <PricingSearchDropdown
                                enabled={open}
                                activeSectionName={sections.find(s => s.id === activeSectionId)?.name}
                                onAddItem={addItemToSection}
                            />
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-1 space-y-4">
                        {/* Sections with line items */}
                        {sections.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground text-sm">
                                Click &ldquo;Add Section&rdquo; to start building your quote, then search to add items.
                            </div>
                        )}

                        {sections.map((section, sectionIdx) => {
                            const isActive = activeSectionId === section.id;
                            const sectionTotal = section.items.reduce((sum, li) => sum + li.quantity * (li.material_cost + li.labour_cost), 0);
                            return (
                                <div
                                    key={section.id}
                                    className={`rounded-xl border bg-card overflow-hidden transition-colors ${isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
                                    onClick={() => setActiveSectionId(section.id)}
                                >
                                    {/* Section header */}
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/30 border-b border-border">
                                        <SectionIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <input
                                            type="text"
                                            value={section.name}
                                            onChange={(e) => updateSectionName(section.id, e.target.value)}
                                            className="flex-1 bg-transparent font-medium text-sm focus:outline-none focus:bg-muted/40 rounded px-1 py-0.5 -ml-1 border border-transparent focus:border-border transition-colors"
                                        />
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveSectionUp(sectionIdx); }}
                                                disabled={sectionIdx === 0}
                                                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                            >
                                                <IconChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveSectionDown(sectionIdx); }}
                                                disabled={sectionIdx === sections.length - 1}
                                                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                            >
                                                <IconChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                                                className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section line items */}
                                    <table className="w-full text-base">
                                        <thead>
                                            <tr className="border-b border-border/50">
                                                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                                                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[88px]">Qty</th>
                                                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Material</th>
                                                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Labour</th>
                                                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">Total</th>
                                                <th className="w-10" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {section.items.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground/60 text-sm">
                                                        {isActive ? "Search above to add items to this section" : "Click to select, then search to add items"}
                                                    </td>
                                                </tr>
                                            )}
                                            {section.items.map((li, itemIdx) => {
                                                const lineTotal = li.quantity * (li.material_cost + li.labour_cost);
                                                return (
                                                    <tr key={itemIdx} className="border-b border-border/50 last:border-0">
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={li.description}
                                                                onChange={(e) => updateLineItem(section.id, itemIdx, "description", e.target.value)}
                                                                className="w-full bg-transparent font-medium text-sm focus:outline-none focus:bg-muted/40 rounded px-1 py-0.5 -ml-1 border border-transparent focus:border-border transition-colors"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={li.line_description}
                                                                onChange={(e) => updateLineItem(section.id, itemIdx, "line_description", e.target.value)}
                                                                placeholder="Add description..."
                                                                className="w-full bg-transparent text-xs text-muted-foreground focus:outline-none focus:bg-muted/40 rounded px-1 py-0.5 -ml-1 border border-transparent focus:border-border transition-colors mt-0.5 placeholder:text-muted-foreground/40"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right w-[88px]">
                                                            <InlineNumberInput value={li.quantity} onSave={(v) => updateLineItem(section.id, itemIdx, "quantity", v)} />
                                                        </td>
                                                        <td className="px-4 py-3 text-right w-28">
                                                            <InlineNumberInput value={li.material_cost} onSave={(v) => updateLineItem(section.id, itemIdx, "material_cost", v)} prefix="$" />
                                                        </td>
                                                        <td className="px-4 py-3 text-right w-28">
                                                            <InlineNumberInput value={li.labour_cost} onSave={(v) => updateLineItem(section.id, itemIdx, "labour_cost", v)} prefix="$" />
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium tabular-nums w-28">
                                                            {formatCurrency(lineTotal)}
                                                        </td>
                                                        <td className="px-2 py-3 w-10">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLineItem(section.id, itemIdx)}
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

                                    {/* Section subtotal */}
                                    {section.items.length > 0 && (
                                        <div className="flex justify-end px-4 py-2 border-t border-border/50 bg-secondary/10">
                                            <span className="text-xs text-muted-foreground mr-2">Section total:</span>
                                            <span className="text-sm font-medium tabular-nums">{formatCurrency(sectionTotal)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Summary */}
                        {totalItemCount > 0 && (
                            <div className="flex justify-end">
                                <div className="w-full sm:max-w-[50%] rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
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

                                    <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground">Material margin</label>
                                            <div className="relative">
                                                <Input type="number" min={0} max={100} value={materialMargin} onChange={(e) => setMaterialMargin(Number(e.target.value) || 0)} className="rounded-lg h-8 text-xs pr-7" />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted-foreground">Labour margin</label>
                                            <div className="relative">
                                                <Input type="number" min={0} max={100} value={labourMargin} onChange={(e) => setLabourMargin(Number(e.target.value) || 0)} className="rounded-lg h-8 text-xs pr-7" />
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
                                            <span className="tabular-nums text-sm">{formatCurrency(totals.gst)}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                                        <span>Grand Total</span>
                                        <span className="tabular-nums">{formatCurrency(totals.grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5 mb-3">
                            <label className="text-sm font-medium text-muted-foreground">Notes</label>
                            <textarea
                                placeholder="Additional notes..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 mt-1 border-t border-border px-1 shrink-0 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {sections.length} section{sections.length !== 1 ? "s" : ""} · {totalItemCount} item{totalItemCount !== 1 ? "s" : ""}
                            </span>
                            {totalItemCount > 0 && <span className="font-medium text-foreground">{formatCurrency(totals.grandTotal)}</span>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 sm:flex-none" disabled={totalItemCount === 0 || saving}>
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
                        mutateContacts();
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
