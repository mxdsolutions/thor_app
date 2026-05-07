"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IconLayoutList as SectionIcon } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils";
import { useContactOptions } from "@/lib/swr";
import { PricingSearchDropdown, type NewLineItem } from "@/components/quotes/PricingSearchDropdown";

import { QuoteContactPicker } from "./create-quote/QuoteContactPicker";
import { QuoteSectionsList } from "./create-quote/QuoteSectionsList";
import { QuoteTotalsSummary } from "./create-quote/QuoteTotalsSummary";
import type { Section, ContactOption } from "./create-quote/types";

const CreateContactModal = lazy(() =>
    import("./CreateContactModal").then(mod => ({ default: mod.CreateContactModal }))
);

interface CreateQuoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (quote: Record<string, unknown>) => void;
    defaultValues?: { contactId?: string; companyId?: string; jobId?: string };
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
    const [scopeDescription, setScopeDescription] = useState("");
    const [validUntil, setValidUntil] = useState(defaultValidUntil());
    const [materialMargin, setMaterialMargin] = useState(20);
    const [labourMargin, setLabourMargin] = useState(20);
    const [gstInclusive, setGstInclusive] = useState(true);

    // Contact
    const { data: contactsData, mutate: mutateContacts } = useContactOptions(open);
    const contacts: ContactOption[] = useMemo(() => contactsData?.items ?? [], [contactsData]);
    const [contactId, setContactId] = useState("");
    const [showCreateContact, setShowCreateContact] = useState(false);
    const [companyId, setCompanyId] = useState("");

    // Sections
    const [sections, setSections] = useState<Section[]>([]);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
    const totalItemCount = allItems.length;

    useEffect(() => {
        if (!open) return;
        if (defaultValues?.contactId) setContactId(defaultValues.contactId);
        if (defaultValues?.companyId) setCompanyId(defaultValues.companyId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

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
                <DialogContent className="sm:max-w-[900px] h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>New Quote</DialogTitle>
                        <DialogDescription>Build a quote from the pricing matrix.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <DialogBody className="space-y-4 pb-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <QuoteContactPicker
                                        contacts={contacts}
                                        contactId={contactId}
                                        setContactId={setContactId}
                                        setCompanyId={setCompanyId}
                                        onRequestCreate={() => setShowCreateContact(true)}
                                    />
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

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Scope / Description</label>
                                    <textarea
                                        placeholder="Describe the scope of work..."
                                        value={scopeDescription}
                                        onChange={(e) => setScopeDescription(e.target.value)}
                                        rows={2}
                                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                    />
                                </div>

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

                            <div className="space-y-4">
                                <QuoteSectionsList
                                    sections={sections}
                                    activeSectionId={activeSectionId}
                                    setActiveSectionId={setActiveSectionId}
                                    updateSectionName={updateSectionName}
                                    moveSectionUp={moveSectionUp}
                                    moveSectionDown={moveSectionDown}
                                    removeSection={removeSection}
                                    updateLineItem={updateLineItem}
                                    removeLineItem={removeLineItem}
                                />

                                {totalItemCount > 0 && (
                                    <QuoteTotalsSummary
                                        materialSum={totals.materialSum}
                                        labourSum={totals.labourSum}
                                        gst={totals.gst}
                                        grandTotal={totals.grandTotal}
                                        materialMargin={materialMargin}
                                        setMaterialMargin={setMaterialMargin}
                                        labourMargin={labourMargin}
                                        setLabourMargin={setLabourMargin}
                                        gstInclusive={gstInclusive}
                                        setGstInclusive={setGstInclusive}
                                    />
                                )}

                                <div className="space-y-1.5 mb-3">
                                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                                    <textarea
                                        placeholder="Additional notes..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                    />
                                </div>
                            </div>
                        </DialogBody>
                        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm text-muted-foreground">
                                {sections.length} section{sections.length !== 1 ? "s" : ""} · {totalItemCount} item{totalItemCount !== 1 ? "s" : ""}
                                {totalItemCount > 0 && <span className="ml-2 font-medium text-foreground">{formatCurrency(totals.grandTotal)}</span>}
                            </span>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 sm:flex-none" disabled={totalItemCount === 0 || saving}>
                                    {saving ? "Creating..." : "Create Quote"}
                                </Button>
                            </div>
                        </DialogFooter>
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
                            if (contact.company_id) setCompanyId(contact.company_id);
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
