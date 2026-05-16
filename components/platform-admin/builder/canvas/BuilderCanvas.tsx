"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FieldDef, FieldType, TemplateSchema } from "@/lib/report-templates/types";
import { dedupeId, slugifyUnderscore } from "@/lib/report-templates/ids";
import { makeDefaultField } from "../question-types";
import { useBuilderActions } from "./context";
import { PageContent } from "./PageContent";

interface BuilderCanvasProps {
    schema: TemplateSchema;
    currentPageIndex: number;
    direction: number;
}

const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

/**
 * Animated wrapper around the active page's `<PageContent>`. Owns transient
 * "which field did the user just add" focus state, then delegates everything
 * else to subcomponents under canvas/.
 *
 * `mode` and field-mutator callbacks come from `<CanvasProvider>` set up by
 * BuilderShell, not via props — see `./context.tsx`.
 */
export function BuilderCanvas({ schema, currentPageIndex, direction }: BuilderCanvasProps) {
    const actions = useBuilderActions();
    const [justAddedFieldId, setJustAddedFieldId] = useState<{
        sectionIndex: number;
        fieldId: string;
    } | null>(null);

    const handleAddQuestion = (sectionIndex: number, type: FieldType) => {
        const draft = makeDefaultField(type);
        // The default id is a placeholder (PENDING_FIELD_ID). Derive a real
        // id from the default label and dedupe against the section's
        // existing field ids.
        const baseId = slugifyUnderscore(draft.label) || "question";
        const existingIds = new Set(schema.sections[sectionIndex].fields.map((f) => f.id));
        const finalId = dedupeId(baseId, existingIds);
        const newField: FieldDef = { ...draft, id: finalId };
        actions.addField(sectionIndex, newField);
        setJustAddedFieldId({ sectionIndex, fieldId: finalId });
    };

    const section = schema.sections[currentPageIndex];

    return (
        <div className="flex-1 overflow-y-auto bg-background">
            {/* Container padding matches WizardStepContent at /r exactly */}
            <div className="max-w-3xl mx-auto px-4 py-5 sm:p-6 lg:p-8 space-y-6">
                {/* Single page, animated swap between pages */}
                {section && (
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={section.id}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                            <PageContent
                                section={section}
                                sectionIndex={currentPageIndex}
                                totalSections={schema.sections.length}
                                justAddedFieldId={
                                    justAddedFieldId?.sectionIndex === currentPageIndex
                                        ? justAddedFieldId.fieldId
                                        : null
                                }
                                onAddQuestion={handleAddQuestion}
                            />
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
