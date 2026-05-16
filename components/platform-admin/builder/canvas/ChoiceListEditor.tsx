"use client";

import { useRef } from "react";
import { Trash2 as TrashIcon } from "lucide-react";
import { slugifyUnderscore } from "@/lib/report-templates/ids";

interface ChoiceListEditorProps {
    options: { label: string; value: string }[];
    onUpdate: (options: { label: string; value: string }[]) => void;
}

/**
 * Inline list editor for select-type fields. Each row is a free-text label;
 * the slug-derived `value` auto-updates while it tracks the label (until the
 * user manually edits the value). Add appends; delete removes by index.
 *
 * Per-row React keys are tracked in `keysRef` in lockstep with `onUpdate(...)`
 * calls so deletes don't reuse DOM nodes for a different row and lose focus
 * mid-edit. The render-time length-sync block handles the rare case where
 * the parent swaps the options out from under us (e.g. field type changed
 * and back) by padding/trimming with fresh ids.
 */
export function ChoiceListEditor({ options, onUpdate }: ChoiceListEditorProps) {
    const keysRef = useRef<string[]>([]);
    if (keysRef.current.length < options.length) {
        while (keysRef.current.length < options.length) {
            keysRef.current.push(crypto.randomUUID());
        }
    } else if (keysRef.current.length > options.length) {
        keysRef.current = keysRef.current.slice(0, options.length);
    }

    const handleAdd = () => {
        keysRef.current = [...keysRef.current, crypto.randomUUID()];
        onUpdate([...options, { label: "", value: "" }]);
    };

    const handleRemove = (index: number) => {
        keysRef.current = keysRef.current.filter((_, j) => j !== index);
        onUpdate(options.filter((_, j) => j !== index));
    };

    return (
        <div className="space-y-1 rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                Choices
            </p>
            {options.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60 italic">No choices yet.</p>
            )}
            {options.map((opt, i) => (
                <div key={keysRef.current[i]} className="flex items-center gap-2 group/choice">
                    <span className="w-3 h-3 rounded-full border border-border/60 shrink-0" />
                    <input
                        value={opt.label}
                        onChange={(e) => {
                            const next = [...options];
                            const newLabel = e.target.value;
                            const prevAuto = slugifyUnderscore(next[i].label);
                            const valueIsAuto = !next[i].value || next[i].value === prevAuto;
                            next[i] = {
                                label: newLabel,
                                value: valueIsAuto ? slugifyUnderscore(newLabel) : next[i].value,
                            };
                            onUpdate(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`Choice ${i + 1}`}
                        className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-0 text-xs py-0.5"
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(i);
                        }}
                        className="opacity-0 group-hover/choice:opacity-100 p-0.5 text-muted-foreground hover:text-red-500"
                        aria-label="Remove choice"
                    >
                        <TrashIcon className="w-2.5 h-2.5" />
                    </button>
                </div>
            ))}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleAdd();
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground py-0.5"
            >
                + Add choice
            </button>
        </div>
    );
}
