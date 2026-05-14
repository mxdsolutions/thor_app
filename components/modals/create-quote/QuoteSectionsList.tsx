"use client";

import { Trash2 as TrashIcon, LayoutList as SectionIcon, ChevronUp, ChevronDown } from "lucide-react";
import { InlineNumberInput } from "@/features/line-items/InlineNumberInput";
import { formatCurrency } from "@/lib/utils";
import type { NewLineItem } from "@/components/quotes/PricingSearchDropdown";
import type { Section } from "./types";

interface Props {
    sections: Section[];
    activeSectionId: string | null;
    setActiveSectionId: (id: string) => void;
    updateSectionName: (sectionId: string, name: string) => void;
    moveSectionUp: (idx: number) => void;
    moveSectionDown: (idx: number) => void;
    removeSection: (sectionId: string) => void;
    updateLineItem: (sectionId: string, itemIdx: number, field: keyof NewLineItem, value: number | string) => void;
    removeLineItem: (sectionId: string, itemIdx: number) => void;
}

export function QuoteSectionsList({
    sections,
    activeSectionId,
    setActiveSectionId,
    updateSectionName,
    moveSectionUp,
    moveSectionDown,
    removeSection,
    updateLineItem,
    removeLineItem,
}: Props) {
    if (sections.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground text-sm">
                Click &ldquo;Add Section&rdquo; to start building your quote, then search to add items.
            </div>
        );
    }

    return (
        <>
            {sections.map((section, sectionIdx) => {
                const isActive = activeSectionId === section.id;
                const sectionTotal = section.items.reduce(
                    (sum, li) => sum + li.quantity * (li.material_cost + li.labour_cost),
                    0
                );
                return (
                    <div
                        key={section.id}
                        className={`rounded-xl border bg-card overflow-hidden transition-colors ${isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
                        onClick={() => setActiveSectionId(section.id)}
                    >
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
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); moveSectionDown(sectionIdx); }}
                                    disabled={sectionIdx === sections.length - 1}
                                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
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

                        {section.items.length > 0 && (
                            <div className="flex justify-end px-4 py-2 border-t border-border/50 bg-secondary/10">
                                <span className="text-xs text-muted-foreground mr-2">Section total:</span>
                                <span className="text-sm font-medium tabular-nums">{formatCurrency(sectionTotal)}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
