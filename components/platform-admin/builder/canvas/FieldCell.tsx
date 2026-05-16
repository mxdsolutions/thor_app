"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FieldDef } from "@/lib/report-templates/types";
import { FormField } from "@/components/reports/FormField";
import { useCanvasMode, useFieldActions } from "./context";
import { FieldToolbar } from "./FieldToolbar";
import { ChoiceListEditor } from "./ChoiceListEditor";

interface FieldCellProps {
    field: FieldDef;
    fieldIndex: number;
    sectionIndex: number;
    total: number;
    autoFocusLabel: boolean;
    isHalf: boolean;
}

/**
 * Wraps a `FormField` with the builder's edit-mode affordances: an
 * activation state on hover/click, a floating `FieldToolbar`, and the inline
 * `ChoiceListEditor` for select-type fields.
 */
export function FieldCell({
    field,
    fieldIndex,
    sectionIndex,
    total,
    autoFocusLabel,
    isHalf,
}: FieldCellProps) {
    const mode = useCanvasMode();
    const fieldActions = useFieldActions(sectionIndex, fieldIndex);
    const [active, setActive] = useState(false);
    const isEdit = mode === "edit";

    const handleFieldChange = (updates: Partial<FieldDef>) => {
        fieldActions.update({ ...field, ...updates });
    };

    const isSelect = field.type === "select";

    return (
        <div
            onClick={() => isEdit && setActive(true)}
            onBlur={(e) => {
                // Deactivate when focus leaves the cell entirely
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setActive(false);
                }
            }}
            className={cn(
                "relative rounded-xl transition-colors",
                isHalf ? "col-span-1" : "col-span-2",
                // Small outset that stays within the grid's gap-4 (16px) so
                // adjacent cells don't overlap.
                isEdit && "px-2 py-1.5 -mx-2 -my-1.5",
                isEdit && active && "bg-secondary/40 ring-1 ring-border",
                isEdit && !active && "hover:bg-secondary/20 group/cell",
            )}
        >
            {isEdit && (
                <FieldToolbar
                    field={field}
                    index={fieldIndex}
                    total={total}
                    active={active}
                    onUpdate={handleFieldChange}
                    actions={fieldActions}
                />
            )}

            <FormField
                field={field}
                value={undefined}
                onChange={() => {}}
                mode={isEdit ? "edit" : "preview"}
                onFieldChange={handleFieldChange}
                autoFocusLabel={autoFocusLabel}
            />

            {/* Inline choice editor for select fields when active */}
            {isEdit && active && isSelect && (
                <div className="mt-2">
                    <ChoiceListEditor
                        options={field.options || []}
                        onUpdate={(options) => handleFieldChange({ options })}
                    />
                </div>
            )}
        </div>
    );
}
