"use client";

import {
    Trash2 as TrashIcon,
    ChevronUp as ChevronUpIcon,
    ChevronDown as ChevronDownIcon,
    Copy as DuplicateIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldDef, FieldType } from "@/lib/report-templates/types";
import { QUESTION_TYPE_META } from "../question-types";
import type { FieldActions } from "./context";

interface FieldToolbarProps {
    field: FieldDef;
    index: number;
    total: number;
    active: boolean;
    /** Partial-merge update — used by Req / width / type toggles. The parent
     *  FieldCell wraps `useFieldActions` with the merge semantics so we don't
     *  duplicate the spread here. */
    onUpdate: (updates: Partial<FieldDef>) => void;
    /** Field-scoped actions: move / duplicate / delete. Passed by FieldCell
     *  rather than re-derived via `useFieldActions` so the indices flow
     *  through one place. */
    actions: FieldActions;
}

/**
 * Floating per-field affordance row: question type select, required toggle,
 * width toggle, move up/down, duplicate, delete.
 */
export function FieldToolbar({ field, index, total, active, onUpdate, actions }: FieldToolbarProps) {
    const isHeading = field.type === "heading";

    return (
        <div
            className={cn(
                "absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-lg bg-background border border-border px-1 py-0.5 shadow-sm transition-opacity",
                active ? "opacity-100" : "opacity-0 group-hover/cell:opacity-100 focus-within:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Compact toolbar-internal select kept native rather than swapped
                to Radix <Select> — the trigger needs to be borderless and
                sit flush inside the toolbar's tight 8px×24px chrome. A
                Radix popover would visually dominate the toolbar. */}
            <select
                value={field.type}
                onChange={(e) => onUpdate({ type: e.target.value as FieldType })}
                className="text-xs bg-transparent border-none focus:outline-none cursor-pointer pr-1 py-0.5 max-w-[110px]"
                aria-label="Question type"
            >
                {(Object.entries(QUESTION_TYPE_META) as [FieldType, { label: string }][]).map(
                    ([v, m]) => (
                        <option key={v} value={v}>{m.label}</option>
                    ),
                )}
            </select>
            {!isHeading && (
                <>
                    <button
                        onClick={() => onUpdate({ required: !field.required })}
                        className={cn(
                            "text-[10px] rounded-md px-1.5 py-0.5 font-medium transition-colors",
                            field.required
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                        title={field.required ? "Required" : "Not required"}
                    >
                        Req
                    </button>
                    <button
                        onClick={() => onUpdate({ width: field.width === "half" ? "full" : "half" })}
                        className={cn(
                            "text-[10px] rounded-md px-1.5 py-0.5 font-medium transition-colors",
                            field.width === "half"
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                        title={field.width === "half" ? "Half width" : "Full width"}
                    >
                        {field.width === "half" ? "½" : "1×"}
                    </button>
                </>
            )}
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
                onClick={() => actions.move("up")}
                disabled={index === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md"
                aria-label="Move up"
            >
                <ChevronUpIcon className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={() => actions.move("down")}
                disabled={index === total - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-md"
                aria-label="Move down"
            >
                <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={() => actions.duplicate()}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md"
                aria-label="Duplicate"
            >
                <DuplicateIcon className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={() => actions.delete()}
                className="p-1 text-muted-foreground hover:text-red-500 rounded-md"
                aria-label="Delete"
            >
                <TrashIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
