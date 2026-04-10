"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import type { TemplateSchema, SectionDef, FieldDef } from "@/lib/report-templates/types";
import type { PresetFieldGroup } from "@/lib/report-templates/presets";
import { BuilderTopBar } from "./BuilderTopBar";
import { BuilderSectionBar } from "./BuilderSectionBar";
import { BuilderLeftPanel } from "./BuilderLeftPanel";
import { BuilderPreviewCanvas } from "./BuilderPreviewCanvas";
import { BuilderRightPanel } from "./BuilderRightPanel";

interface BuilderShellProps {
    templateId: string;
    initialSchema: TemplateSchema;
    initialMeta: { name: string; category: string; description: string };
    onSave: (schema: TemplateSchema, meta: { name: string; category: string; description: string }) => Promise<void>;
}

function generateSectionId(title: string): string {
    return (
        title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 50) || `section_${Date.now()}`
    );
}

function deduplicateFieldId(id: string, existingIds: Set<string>): string {
    if (!existingIds.has(id)) return id;
    let suffix = 2;
    while (existingIds.has(`${id}_${suffix}`)) suffix++;
    return `${id}_${suffix}`;
}

export function BuilderShell({ templateId, initialSchema, initialMeta, onSave }: BuilderShellProps) {
    const [schema, setSchema] = useState<TemplateSchema>(initialSchema);
    const [meta, setMeta] = useState(initialMeta);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        initialSchema.sections.length > 0 ? 0 : null
    );
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const selectedSection = selectedIndex !== null ? schema.sections[selectedIndex] : null;

    const markChanged = useCallback(() => setHasChanges(true), []);

    const updateSections = useCallback(
        (updater: (sections: SectionDef[]) => SectionDef[]) => {
            setSchema((prev) => ({ ...prev, sections: updater(prev.sections) }));
            markChanged();
        },
        [markChanged]
    );

    // --- Section operations ---
    const handleAddSection = () => {
        const title = `Section ${schema.sections.length + 1}`;
        const newSection: SectionDef = {
            id: generateSectionId(title),
            title,
            type: "standard",
            fields: [],
        };
        updateSections((s) => [...s, newSection]);
        setSelectedIndex(schema.sections.length);
    };

    const handleDeleteSection = (index: number) => {
        updateSections((s) => s.filter((_, i) => i !== index));
        setSelectedIndex((prev) => {
            if (prev === null) return null;
            const newLen = schema.sections.length - 1;
            if (newLen === 0) return null;
            if (prev === index) return Math.max(0, index - 1);
            if (prev > index) return prev - 1;
            return prev;
        });
    };

    const handleMoveSection = (index: number, direction: "left" | "right") => {
        const target = direction === "left" ? index - 1 : index + 1;
        updateSections((s) => {
            const next = [...s];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setSelectedIndex(target);
    };

    const handleUpdateSectionMeta = (updates: Partial<SectionDef>) => {
        if (selectedIndex === null) return;
        updateSections((s) =>
            s.map((sec, i) => (i === selectedIndex ? { ...sec, ...updates } : sec))
        );
    };

    // --- Field operations ---
    const handleAddField = (field: FieldDef) => {
        if (selectedIndex === null) return;
        updateSections((s) =>
            s.map((sec, i) => (i === selectedIndex ? { ...sec, fields: [...sec.fields, field] } : sec))
        );
    };

    const handleUpdateField = (fieldIndex: number, field: FieldDef) => {
        if (selectedIndex === null) return;
        updateSections((s) =>
            s.map((sec, i) =>
                i === selectedIndex
                    ? { ...sec, fields: sec.fields.map((f, fi) => (fi === fieldIndex ? field : f)) }
                    : sec
            )
        );
    };

    const handleDeleteField = (fieldIndex: number) => {
        if (selectedIndex === null) return;
        updateSections((s) =>
            s.map((sec, i) =>
                i === selectedIndex ? { ...sec, fields: sec.fields.filter((_, fi) => fi !== fieldIndex) } : sec
            )
        );
    };

    const handleMoveField = (fieldIndex: number, direction: "up" | "down") => {
        if (selectedIndex === null) return;
        const target = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
        updateSections((s) =>
            s.map((sec, i) => {
                if (i !== selectedIndex) return sec;
                const fields = [...sec.fields];
                [fields[fieldIndex], fields[target]] = [fields[target], fields[fieldIndex]];
                return { ...sec, fields };
            })
        );
    };

    // --- Preset fields ---
    const handleAddPreset = (preset: PresetFieldGroup) => {
        if (selectedIndex === null) return;
        const section = schema.sections[selectedIndex];
        const existingIds = new Set(section.fields.map((f) => f.id));
        let renamed = 0;

        const newFields = preset.fields.map((field) => {
            const newId = deduplicateFieldId(field.id, existingIds);
            if (newId !== field.id) renamed++;
            existingIds.add(newId);
            return { ...field, id: newId };
        });

        updateSections((s) =>
            s.map((sec, i) => (i === selectedIndex ? { ...sec, fields: [...sec.fields, ...newFields] } : sec))
        );

        const msg = `Added ${newFields.length} fields from "${preset.name}"`;
        toast.success(renamed > 0 ? `${msg} (${renamed} IDs adjusted)` : msg);
    };

    // --- Meta ---
    const handleUpdateMeta = (updates: { name?: string; category?: string; description?: string }) => {
        setMeta((prev) => ({ ...prev, ...updates }));
        markChanged();
    };

    // --- Save ---
    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(schema, meta);
            setHasChanges(false);
        } catch {
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <BuilderTopBar
                templateId={templateId}
                templateName={meta.name}
                saving={saving}
                hasChanges={hasChanges}
                onSave={handleSave}
            />

            {schema.sections.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/30">
                    <div className="text-center max-w-sm">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                            <PlusIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-sm font-semibold mb-1">No sections yet</h2>
                        <p className="text-xs text-muted-foreground mb-4">
                            Sections group related fields together. Add your first section to start building the template.
                        </p>
                        <Button onClick={handleAddSection} className="px-6">
                            Create First Section
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-1 overflow-hidden">
                        {selectedSection ? (
                            <BuilderLeftPanel
                                key={selectedIndex}
                                section={selectedSection}
                                onUpdateSection={handleUpdateSectionMeta}
                                onAddField={handleAddField}
                                onUpdateField={handleUpdateField}
                                onDeleteField={handleDeleteField}
                                onMoveField={handleMoveField}
                            />
                        ) : (
                            <div className="w-[280px] border-r border-border bg-background flex items-center justify-center shrink-0">
                                <p className="text-xs text-muted-foreground">Select a section</p>
                            </div>
                        )}

                        <BuilderPreviewCanvas
                            section={selectedSection}
                            selectedIndex={selectedIndex}
                            schema={schema}
                        />

                        <BuilderRightPanel
                            name={meta.name}
                            category={meta.category}
                            description={meta.description}
                            onUpdateMeta={handleUpdateMeta}
                            hasSectionSelected={selectedSection !== null}
                            onAddPreset={handleAddPreset}
                        />
                    </div>

                    <BuilderSectionBar
                        sections={schema.sections}
                        selectedIndex={selectedIndex}
                        onSelect={setSelectedIndex}
                        onAdd={handleAddSection}
                        onDelete={handleDeleteSection}
                        onMove={handleMoveSection}
                    />
                </>
            )}
        </div>
    );
}
