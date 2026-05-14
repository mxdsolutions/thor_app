"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus as PlusIcon, Pencil as PencilSquareIcon, Trash2 as TrashIcon, ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon } from "lucide-react";
import type { SectionDef, FieldDef } from "@/lib/report-templates/types";
import { FIELD_TYPE_LABELS } from "@/lib/report-templates/types";
import { FieldEditor } from "../FieldEditor";

interface BuilderLeftPanelProps {
    section: SectionDef;
    onUpdateSection: (updates: Partial<SectionDef>) => void;
    onAddField: (field: FieldDef) => void;
    onUpdateField: (index: number, field: FieldDef) => void;
    onDeleteField: (index: number) => void;
    onMoveField: (index: number, direction: "up" | "down") => void;
}

export function BuilderLeftPanel({
    section,
    onUpdateSection,
    onAddField,
    onUpdateField,
    onDeleteField,
    onMoveField,
}: BuilderLeftPanelProps) {
    const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldDef | null>(null);
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

    const handleOpenNewField = () => {
        setEditingField(null);
        setEditingFieldIndex(null);
        setFieldEditorOpen(true);
    };

    const handleOpenEditField = (index: number) => {
        setEditingField(section.fields[index]);
        setEditingFieldIndex(index);
        setFieldEditorOpen(true);
    };

    const handleSaveField = (field: FieldDef) => {
        if (editingFieldIndex !== null) {
            onUpdateField(editingFieldIndex, field);
        } else {
            onAddField(field);
        }
    };

    return (
        <div className="w-[280px] border-r border-border bg-background flex flex-col overflow-hidden shrink-0">
            {/* Section config */}
            <div className="p-4 border-b border-border space-y-3">
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Section Title
                    </label>
                    <Input
                        value={section.title}
                        onChange={(e) => onUpdateSection({ title: e.target.value })}
                        className="rounded-xl mt-1 h-8 text-sm"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Description
                    </label>
                    <Input
                        value={section.description || ""}
                        onChange={(e) => onUpdateSection({ description: e.target.value || undefined })}
                        placeholder="Optional..."
                        className="rounded-xl mt-1 h-8 text-sm"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Type
                    </label>
                    <select
                        value={section.type}
                        onChange={(e) => onUpdateSection({ type: e.target.value as "standard" | "repeater" })}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 text-base mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="standard">Standard</option>
                        <option value="repeater">Repeater</option>
                    </select>
                </div>
                {section.type === "repeater" && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Min</label>
                            <Input
                                type="number"
                                value={section.minItems ?? ""}
                                onChange={(e) => onUpdateSection({ minItems: e.target.value ? Number(e.target.value) : undefined })}
                                className="rounded-xl mt-1 h-8 text-sm"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Max</label>
                            <Input
                                type="number"
                                value={section.maxItems ?? ""}
                                onChange={(e) => onUpdateSection({ maxItems: e.target.value ? Number(e.target.value) : undefined })}
                                className="rounded-xl mt-1 h-8 text-sm"
                                min={1}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Fields list */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Fields ({section.fields.length})
                </h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleOpenNewField}>
                    <PlusIcon className="w-3 h-3 mr-1" />
                    Add
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {section.fields.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <p className="text-xs text-muted-foreground">No fields yet.</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                            Add fields manually or use Quick Add presets on the right.
                        </p>
                    </div>
                ) : (
                    section.fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="group flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-secondary/60 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={cn(
                                        "text-[9px] font-medium px-1.5 py-0.5 rounded-md",
                                        "bg-secondary text-muted-foreground"
                                    )}>
                                        {FIELD_TYPE_LABELS[field.type] || field.type}
                                    </span>
                                    {field.width === "half" && (
                                        <span className="text-[9px] text-muted-foreground/50">Half</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onMoveField(index, "up")}
                                    disabled={index === 0}
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                    <ChevronUpIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => onMoveField(index, "down")}
                                    disabled={index === section.fields.length - 1}
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                    <ChevronDownIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => handleOpenEditField(index)}
                                    className="p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                    <PencilSquareIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => onDeleteField(index)}
                                    className="p-0.5 text-muted-foreground hover:text-red-500"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <FieldEditor
                open={fieldEditorOpen}
                onOpenChange={setFieldEditorOpen}
                field={editingField}
                onSave={handleSaveField}
            />
        </div>
    );
}
