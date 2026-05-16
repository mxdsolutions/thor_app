"use client";

import { Repeat as RepeatIcon } from "lucide-react";
import type { SectionDef, FieldType } from "@/lib/report-templates/types";
import { useCanvasMode, useSectionActions } from "./context";
import { FieldCell } from "./FieldCell";
import { SectionSettings } from "./SectionSettings";
import { AddQuestionRow } from "./AddQuestionRow";

interface PageContentProps {
    section: SectionDef;
    sectionIndex: number;
    totalSections: number;
    justAddedFieldId: string | null;
    /** Insert a new question of the given type into this section. Owned by
     *  BuilderCanvas because it also drives the auto-focus state. */
    onAddQuestion: (sectionIndex: number, type: FieldType) => void;
}

/**
 * Matches FormSection in `borderless` mode (as used by the wizard at /r).
 * Flat layout: section title with `pb-4`, then the field grid directly on
 * the page background. For repeater sections the grid is wrapped in a single
 * item-template card to reflect how each repeater entry renders on /r.
 */
export function PageContent({
    section,
    sectionIndex,
    totalSections,
    justAddedFieldId,
    onAddQuestion,
}: PageContentProps) {
    const mode = useCanvasMode();
    const sectionActions = useSectionActions(sectionIndex);
    const isEdit = mode === "edit";
    const isRepeater = section.type === "repeater";

    // --- Section header (borderless: just pb-4, no card chrome) ---
    // Section title / description use native <input>s rather than the design
    // system's <Input> primitive because they're inline-editable headings
    // (no border, no fill, sit flush with surrounding text) — the chrome of
    // a normal input would break the visual rhythm. Same pattern as the
    // InlineEditableInput inside FormField.
    const header = (
        <div className="pb-4">
            <div className="flex items-baseline gap-2 group/heading">
                {isEdit ? (
                    <input
                        value={section.title}
                        onChange={(e) => sectionActions.update({ title: e.target.value })}
                        placeholder="Untitled section"
                        className="flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:ring-0 px-0 text-lg font-semibold placeholder:text-muted-foreground/40"
                    />
                ) : (
                    <h3 className="flex-1 min-w-0 text-lg font-semibold">{section.title}</h3>
                )}

                {isRepeater && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        <RepeatIcon className="w-3 h-3" />
                        Multiple entries
                    </span>
                )}

                {isEdit && (
                    <SectionSettings
                        section={section}
                        sectionIndex={sectionIndex}
                        totalSections={totalSections}
                    />
                )}
            </div>

            {/* Description — editable in edit mode, displayed-when-present in preview */}
            {isEdit ? (
                <input
                    value={section.description || ""}
                    onChange={(e) =>
                        sectionActions.update({ description: e.target.value || undefined })
                    }
                    placeholder="Add a section description (optional)"
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-0 mt-0.5 text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                />
            ) : section.description ? (
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            ) : null}
        </div>
    );

    // --- Field grid (shared between standard + repeater body) ---
    const fieldGrid =
        section.fields.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground/60 py-6">
                No questions in this section yet.
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
                {section.fields.map((field, fieldIndex) => {
                    const isHalf = field.width === "half" && field.type !== "heading";
                    return (
                        <FieldCell
                            key={field.id}
                            field={field}
                            fieldIndex={fieldIndex}
                            sectionIndex={sectionIndex}
                            total={section.fields.length}
                            autoFocusLabel={justAddedFieldId === field.id}
                            isHalf={isHalf}
                        />
                    );
                })}
            </div>
        );

    const addQuestion = isEdit ? (
        <div className="mt-4">
            <AddQuestionRow
                onAddQuestion={(type) => onAddQuestion(sectionIndex, type)}
            />
        </div>
    ) : null;

    // --- Repeater: wrap field grid in single "item template" card.
    //     Mirrors RepeaterSection at /r which renders each entry inside
    //     `rounded-2xl border border-border bg-card shadow-sm`.
    if (isRepeater) {
        const itemNoun = section.title.replace(/s$/, "") || "Entry";
        return (
            <div>
                {header}
                <div className="rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {itemNoun} #1
                        </h4>
                        <span className="text-[10px] text-muted-foreground/60">Item template</span>
                    </div>
                    <div className="p-5">{fieldGrid}</div>
                </div>
                {addQuestion}
            </div>
        );
    }

    // --- Standard section: flat, borderless, matches /r wizard exactly
    return (
        <div>
            {header}
            {fieldGrid}
            {addQuestion}
        </div>
    );
}
