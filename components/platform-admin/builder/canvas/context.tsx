"use client";

import { createContext, useContext, useMemo } from "react";
import type { SectionDef, FieldDef } from "@/lib/report-templates/types";
import type { CanvasMode } from "../types";

/**
 * Index-prefixed mutators for the active builder schema. Lives in a context
 * so deep canvas children (FieldToolbar, ChoiceListEditor, SectionSettings)
 * can act on their slice without parents threading seven callbacks down
 * through every layer.
 *
 * `BuilderShell` constructs this object once per render and passes it via
 * `<CanvasProvider>` wrapping `<BuilderCanvas>`.
 */
export interface BuilderActions {
    updateSection: (sectionIndex: number, updates: Partial<SectionDef>) => void;
    deleteSection: (sectionIndex: number) => void;
    addField: (sectionIndex: number, field: FieldDef) => void;
    updateField: (sectionIndex: number, fieldIndex: number, field: FieldDef) => void;
    deleteField: (sectionIndex: number, fieldIndex: number) => void;
    moveField: (sectionIndex: number, fieldIndex: number, direction: "up" | "down") => void;
    duplicateField: (sectionIndex: number, fieldIndex: number) => void;
}

interface CanvasContextValue {
    actions: BuilderActions;
    mode: CanvasMode;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({
    value,
    children,
}: {
    value: CanvasContextValue;
    children: React.ReactNode;
}) {
    return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

function useCanvas(): CanvasContextValue {
    const ctx = useContext(CanvasContext);
    if (!ctx) throw new Error("Canvas hooks must be used inside <CanvasProvider>");
    return ctx;
}

export function useBuilderActions(): BuilderActions {
    return useCanvas().actions;
}

export function useCanvasMode(): CanvasMode {
    return useCanvas().mode;
}

/**
 * Section-scoped action set — the same actions with `sectionIndex` pre-applied.
 * Use inside any component rendered for one specific section.
 */
export interface SectionActions {
    update: (updates: Partial<SectionDef>) => void;
    delete: () => void;
    addField: (field: FieldDef) => void;
    moveField: (fieldIndex: number, direction: "up" | "down") => void;
    deleteField: (fieldIndex: number) => void;
    duplicateField: (fieldIndex: number) => void;
}

export function useSectionActions(sectionIndex: number): SectionActions {
    const actions = useBuilderActions();
    return useMemo<SectionActions>(
        () => ({
            update: (updates) => actions.updateSection(sectionIndex, updates),
            delete: () => actions.deleteSection(sectionIndex),
            addField: (field) => actions.addField(sectionIndex, field),
            moveField: (fieldIndex, direction) =>
                actions.moveField(sectionIndex, fieldIndex, direction),
            deleteField: (fieldIndex) => actions.deleteField(sectionIndex, fieldIndex),
            duplicateField: (fieldIndex) => actions.duplicateField(sectionIndex, fieldIndex),
        }),
        [actions, sectionIndex],
    );
}

/**
 * Field-scoped action set — actions with `sectionIndex` and `fieldIndex`
 * pre-applied. The `update` action takes a full `FieldDef`; callers that
 * want partial-update semantics should spread the existing field themselves.
 */
export interface FieldActions {
    update: (field: FieldDef) => void;
    delete: () => void;
    move: (direction: "up" | "down") => void;
    duplicate: () => void;
}

export function useFieldActions(sectionIndex: number, fieldIndex: number): FieldActions {
    const actions = useBuilderActions();
    return useMemo<FieldActions>(
        () => ({
            update: (field) => actions.updateField(sectionIndex, fieldIndex, field),
            delete: () => actions.deleteField(sectionIndex, fieldIndex),
            move: (direction) => actions.moveField(sectionIndex, fieldIndex, direction),
            duplicate: () => actions.duplicateField(sectionIndex, fieldIndex),
        }),
        [actions, sectionIndex, fieldIndex],
    );
}
