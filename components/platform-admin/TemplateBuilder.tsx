"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus as PlusIcon, Trash2 as TrashIcon, ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon, LayoutGrid as Squares2X2Icon, RefreshCw as ArrowPathRoundedSquareIcon } from "lucide-react";
import type { TemplateSchema, SectionDef } from "@/lib/report-templates/types";
import { SectionEditor } from "./SectionEditor";

interface TemplateBuilderProps {
    templateId: string;
    initialSchema: TemplateSchema;
    onSave: (schema: TemplateSchema) => Promise<void>;
}

function generateSectionId(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50) || `section_${Date.now()}`;
}

export function TemplateBuilder({ initialSchema, onSave }: TemplateBuilderProps) {
    const [schema, setSchema] = useState<TemplateSchema>(initialSchema);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        initialSchema.sections.length > 0 ? 0 : null
    );
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const updateSchema = useCallback((newSchema: TemplateSchema) => {
        setSchema(newSchema);
        setHasChanges(true);
    }, []);

    const handleAddSection = () => {
        const newSection: SectionDef = {
            id: generateSectionId(`Section ${schema.sections.length + 1}`),
            title: `Section ${schema.sections.length + 1}`,
            type: "standard",
            fields: [],
        };
        const newSections = [...schema.sections, newSection];
        updateSchema({ ...schema, sections: newSections });
        setSelectedIndex(newSections.length - 1);
    };

    const handleUpdateSection = (index: number, section: SectionDef) => {
        const newSections = [...schema.sections];
        newSections[index] = section;
        updateSchema({ ...schema, sections: newSections });
    };

    const handleDeleteSection = (index: number) => {
        const newSections = schema.sections.filter((_, i) => i !== index);
        updateSchema({ ...schema, sections: newSections });
        if (selectedIndex === index) {
            setSelectedIndex(newSections.length > 0 ? Math.max(0, index - 1) : null);
        } else if (selectedIndex !== null && selectedIndex > index) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    const handleMoveSection = (index: number, direction: "up" | "down") => {
        const newSections = [...schema.sections];
        const target = direction === "up" ? index - 1 : index + 1;
        [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
        updateSchema({ ...schema, sections: newSections });
        setSelectedIndex(target);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(schema);
            setHasChanges(false);
            toast.success("Template saved");
        } catch {
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const selectedSection = selectedIndex !== null ? schema.sections[selectedIndex] : null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
                <div className="text-xs text-muted-foreground">
                    {schema.sections.length} section{schema.sections.length !== 1 ? "s" : ""} &middot;{" "}
                    {schema.sections.reduce((sum, s) => sum + s.fields.length, 0)} fields
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="px-6"
                >
                    {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar — Section List */}
                <div className="w-72 border-r border-border bg-secondary/30 flex flex-col overflow-hidden shrink-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sections</h3>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddSection}>
                            <PlusIcon className="w-3 h-3 mr-1" />
                            Add
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {schema.sections.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8 px-4">
                                No sections yet. Add a section to start building your template.
                            </p>
                        ) : (
                            schema.sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors group",
                                        selectedIndex === index
                                            ? "bg-foreground/10 border border-foreground/10"
                                            : "hover:bg-muted/50"
                                    )}
                                    onClick={() => setSelectedIndex(index)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{section.title}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {section.type === "repeater" ? (
                                                <ArrowPathRoundedSquareIcon className="w-3 h-3 text-blue-500" />
                                            ) : (
                                                <Squares2X2Icon className="w-3 h-3 text-muted-foreground" />
                                            )}
                                            <span className="text-[10px] text-muted-foreground">
                                                {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveSection(index, "up"); }}
                                            disabled={index === 0}
                                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                        >
                                            <ChevronUpIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveSection(index, "down"); }}
                                            disabled={index === schema.sections.length - 1}
                                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                        >
                                            <ChevronDownIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(index); }}
                                        className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Area — Section Fields */}
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedSection ? (
                        <SectionEditor
                            key={selectedIndex}
                            section={selectedSection}
                            onUpdate={(section) => handleUpdateSection(selectedIndex!, section)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            {schema.sections.length === 0
                                ? "Add a section to get started"
                                : "Select a section to edit its fields"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
