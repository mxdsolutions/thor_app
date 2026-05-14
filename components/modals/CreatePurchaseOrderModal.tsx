"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    EntitySearchDropdown,
    type EntityOption,
} from "@/components/ui/entity-search-dropdown";
import { useCompanyOptions, useContactOptions } from "@/lib/swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Trash2 as TrashIcon, Plus as PlusIcon, Warehouse as SupplierIcon } from "lucide-react";

type Company = {
    id: string;
    name: string;
    is_supplier?: boolean | null;
};

type ContactOption = {
    id: string;
    first_name: string;
    last_name: string;
    company_id?: string | null;
    company?: { id: string; name: string } | null;
};

/** Line item shape used by the modal — same shape regardless of whether it
 *  was seeded from a quote or typed manually. */
type DraftLine = {
    /** Stable client-side key for React */
    key: string;
    description: string;
    quantity: number;
    unit_price: number;
    /** Set when this line was copied from a quote */
    source_quote_line_item_id?: string | null;
    /** Whether this line is included in the PO. Quote-seeded items can be
     *  unchecked; manually-added items are always on. */
    selected: boolean;
    /** Human label of the existing PO that's already allocated this quote
     *  line — when set, the row is disabled. */
    allocatedTo?: string | null;
};

type QuoteLineItemRow = {
    id: string;
    description: string;
    line_description?: string | null;
    quantity: number;
    material_cost: number;
    labour_cost: number;
};

interface CreatePurchaseOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId: string;
    /** When set, modal pre-fetches the quote's line items and presents them
     *  as a checklist. The created PO will carry `source_quote_id` and each
     *  copied line will carry `source_quote_line_item_id`. */
    sourceQuoteId?: string | null;
    onCreated?: () => void;
}

export function CreatePurchaseOrderModal({
    open,
    onOpenChange,
    jobId,
    sourceQuoteId,
    onCreated,
}: CreatePurchaseOrderModalProps) {
    const [companyId, setCompanyId] = useState("");
    const [title, setTitle] = useState("");
    const [reference, setReference] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<DraftLine[]>([]);
    const [seedingFromQuote, setSeedingFromQuote] = useState(false);
    const [saving, setSaving] = useState(false);

    const { data: companiesData, isLoading: companiesLoading, mutate: mutateCompanies } = useCompanyOptions(open);
    const { data: contactsData, isLoading: contactsLoading } = useContactOptions(open);

    // The picker surfaces two things:
    //   1) Companies flagged as suppliers (the canonical entries).
    //   2) Contacts that have a company — searching by a person's name jumps
    //      you to their company. Selecting a contact resolves to its
    //      company_id under the hood so the PO is still addressed to the
    //      company; the contact pick is purely a navigational shortcut.
    //
    // The currently-selected company is always included so editing an
    // existing PO doesn't drop the chosen vendor out of the visible list.
    // Contact options are prefixed `c:` to avoid id collisions with company
    // options (a contact and a company can share a UUID space).
    const supplierOptions: EntityOption[] = useMemo(() => {
        const companies = (companiesData?.items as Company[] | undefined) ?? [];
        const contacts = (contactsData?.items as ContactOption[] | undefined) ?? [];

        const companyOptions: EntityOption[] = companies
            .filter((c) => c.is_supplier || c.id === companyId)
            .map((c) => ({ id: c.id, label: c.name }));

        const contactOptions: EntityOption[] = contacts
            .filter((c) => !!c.company_id)
            .map((c) => ({
                id: `c:${c.id}`,
                label: `${c.first_name} ${c.last_name}`,
                subtitle: c.company?.name ?? null,
                company_id: c.company_id,
            }));

        return [...companyOptions, ...contactOptions];
    }, [companiesData, contactsData, companyId]);

    // Reset internal state whenever the modal closes.
    useEffect(() => {
        if (open) return;
        setCompanyId("");
        setTitle("");
        setReference("");
        setExpectedDate("");
        setNotes("");
        setLines([]);
        setSaving(false);
    }, [open]);

    // Seed line items from the source quote when the modal opens with a quote.
    useEffect(() => {
        if (!open || !sourceQuoteId) return;
        let cancelled = false;
        setSeedingFromQuote(true);

        (async () => {
            try {
                const [liRes, poRes] = await Promise.all([
                    fetch(`/api/quote-line-items?quote_id=${sourceQuoteId}`),
                    fetch(`/api/purchase-orders?source_quote_id=${sourceQuoteId}`),
                ]);
                if (!liRes.ok) throw new Error("Failed to load quote items");
                const liJson = await liRes.json();
                const poJson = poRes.ok ? await poRes.json() : { items: [] };

                // Build a "already-allocated" map: source_quote_line_item_id → PO label.
                const allocated = new Map<string, string>();
                type POWithLines = {
                    id: string;
                    title: string | null;
                    reference_id: string | null;
                    company?: { name: string } | null;
                    line_items?: { source_quote_line_item_id: string | null }[];
                };
                for (const po of (poJson.items as POWithLines[] | undefined) ?? []) {
                    const label = po.company?.name || po.title || po.reference_id || "another PO";
                    for (const li of po.line_items ?? []) {
                        if (li.source_quote_line_item_id) allocated.set(li.source_quote_line_item_id, label);
                    }
                }

                const drafts: DraftLine[] = (liJson.items as QuoteLineItemRow[]).map((li) => {
                    const allocatedTo = allocated.get(li.id) ?? null;
                    return {
                        key: li.id,
                        description: [li.description, li.line_description].filter(Boolean).join(" — "),
                        quantity: li.quantity,
                        unit_price: Number(li.material_cost) + Number(li.labour_cost),
                        source_quote_line_item_id: li.id,
                        selected: !allocatedTo, // tick rows that aren't yet PO'd
                        allocatedTo,
                    };
                });
                if (!cancelled) setLines(drafts);
            } catch (err) {
                if (!cancelled) {
                    toast.error(err instanceof Error ? err.message : "Failed to load quote items");
                }
            } finally {
                if (!cancelled) setSeedingFromQuote(false);
            }
        })();

        return () => { cancelled = true; };
    }, [open, sourceQuoteId]);

    const addBlankLine = () => {
        setLines((prev) => [
            ...prev,
            {
                key: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                description: "",
                quantity: 1,
                unit_price: 0,
                selected: true,
            },
        ]);
    };

    const updateLine = (key: string, patch: Partial<DraftLine>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const removeLine = (key: string) => {
        setLines((prev) => prev.filter((l) => l.key !== key));
    };

    const total = useMemo(
        () => lines.filter((l) => l.selected).reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
        [lines]
    );
    const selectedCount = lines.filter((l) => l.selected).length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) {
            toast.error("Pick a supplier");
            return;
        }
        const selected = lines.filter((l) => l.selected);
        if (sourceQuoteId && selected.length === 0) {
            toast.error("Tick at least one line item");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/purchase-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    job_id: jobId,
                    company_id: companyId,
                    source_quote_id: sourceQuoteId ?? null,
                    title: title.trim() || null,
                    reference_id: reference.trim() || null,
                    expected_date: expectedDate || null,
                    notes: notes.trim() || null,
                    line_items: selected.map((l, idx) => ({
                        description: l.description.trim() || "Item",
                        quantity: Number(l.quantity) || 0,
                        unit_price: Number(l.unit_price) || 0,
                        source_quote_line_item_id: l.source_quote_line_item_id ?? null,
                        sort_order: idx,
                    })),
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create PO");
            }
            toast.success("Purchase order created");
            onCreated?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create PO");
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{sourceQuoteId ? "Generate purchase order" : "New purchase order"}</DialogTitle>
                    <DialogDescription>
                        {sourceQuoteId
                            ? "Tick the line items going to this supplier. Already-allocated items are disabled."
                            : "Address a purchase order to a supplier and add what you're buying."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-4 pb-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <SupplierIcon className="w-3.5 h-3.5" />
                                Supplier
                            </label>
                            <EntitySearchDropdown
                                value={companyId}
                                onChange={(id, opt) => {
                                    // Contact options carry the underlying
                                    // company in `company_id`; everything
                                    // else is already a company id.
                                    setCompanyId(opt?.company_id ?? id);
                                }}
                                options={supplierOptions}
                                placeholder="Search suppliers or contacts..."
                                entityType="company"
                                onCreated={() => mutateCompanies()}
                                loading={companiesLoading || contactsLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Pick a supplier or any contact — the PO is addressed to the contact&rsquo;s company.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Title</label>
                                <Input
                                    placeholder="Optional"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">PO number</label>
                                <Input
                                    placeholder="Optional"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 max-w-xs">
                            <label className="text-sm font-medium text-muted-foreground">Expected delivery</label>
                            <Input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Line items */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Line items
                                    {sourceQuoteId && (
                                        <span className="ml-2 text-xs text-muted-foreground/70">
                                            ({selectedCount} selected · {lines.length} from quote)
                                        </span>
                                    )}
                                </label>
                                <Button type="button" size="sm" variant="outline" onClick={addBlankLine}>
                                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                    Add line
                                </Button>
                            </div>

                            {seedingFromQuote ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">Loading quote items…</p>
                            ) : lines.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No line items yet — add one to get started.
                                </p>
                            ) : (
                                <div className="rounded-xl border border-border divide-y divide-border">
                                    {lines.map((l) => {
                                        const disabled = !!l.allocatedTo;
                                        return (
                                            <div
                                                key={l.key}
                                                className={cn(
                                                    "p-3 flex items-start gap-3",
                                                    disabled && "opacity-60"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={l.selected}
                                                    disabled={disabled}
                                                    onChange={(e) => updateLine(l.key, { selected: e.target.checked })}
                                                    className="mt-2"
                                                />
                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                    <Input
                                                        value={l.description}
                                                        onChange={(e) => updateLine(l.key, { description: e.target.value })}
                                                        placeholder="Description"
                                                        disabled={disabled}
                                                        className="rounded-lg text-sm"
                                                    />
                                                    {l.allocatedTo && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Already on PO: {l.allocatedTo}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 w-44">
                                                    <Input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        value={l.quantity}
                                                        onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) || 0 })}
                                                        disabled={disabled}
                                                        className="rounded-lg text-sm"
                                                        placeholder="Qty"
                                                    />
                                                    <Input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        value={l.unit_price}
                                                        onChange={(e) => updateLine(l.key, { unit_price: Number(e.target.value) || 0 })}
                                                        disabled={disabled}
                                                        className="rounded-lg text-sm"
                                                        placeholder="Unit $"
                                                    />
                                                </div>
                                                {!l.source_quote_line_item_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(l.key)}
                                                        className="text-muted-foreground hover:text-rose-500 mt-2"
                                                        aria-label="Remove line"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {lines.length > 0 && (
                                <div className="flex items-center justify-end gap-3 pt-1 text-sm">
                                    <span className="text-muted-foreground">Total</span>
                                    <span className="font-semibold">${total.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Notes</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!companyId || saving}>
                            {saving ? "Saving…" : sourceQuoteId ? "Generate PO" : "Create PO"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
