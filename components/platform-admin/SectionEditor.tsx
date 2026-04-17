"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import type { SectionDef, FieldDef } from "@/lib/report-templates/types";
import { FieldCard } from "./FieldCard";
import { FieldEditor } from "./FieldEditor";

interface SectionEditorProps {
    section: SectionDef;
    onUpdate: (section: SectionDef) => void;
}

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
    const [editingField, setEditingField] = useState<FieldDef | null>(null);
    const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleAddField = () => {
        setEditingField(null);
        setEditingIndex(null);
        setFieldEditorOpen(true);
    };

    const handleEditField = (index: number) => {
        setEditingField(section.fields[index]);
        setEditingIndex(index);
        setFieldEditorOpen(true);
    };

    const handleSaveField = (field: FieldDef) => {
        const newFields = [...section.fields];
        if (editingIndex !== null) {
            newFields[editingIndex] = field;
        } else {
            newFields.push(field);
        }
        onUpdate({ ...section, fields: newFields });
    };

    const handleDeleteField = (index: number) => {
        onUpdate({ ...section, fields: section.fields.filter((_, i) => i !== index) });
    };

    const handleMoveField = (index: number, direction: "up" | "down") => {
        const newFields = [...section.fields];
        const target = direction === "up" ? index - 1 : index + 1;
        [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
        onUpdate({ ...section, fields: newFields });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Section Title</label>
                        <Input
                            value={section.title}
                            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                            className="rounded-xl"
                            placeholder="e.g. Property Details"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Section Type</label>
                        <select
                            value={section.type}
                            onChange={(e) => onUpdate({ ...section, type: e.target.value as "standard" | "repeater" })}
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="standard">Standard</option>
                            <option value="repeater">Repeater</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Input
                        value={section.description || ""}
                        onChange={(e) => onUpdate({ ...section, description: e.target.value || undefined })}
                        className="rounded-xl"
                        placeholder="Optional section description..."
                    />
                </div>

                {section.type === "repeater" && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Add Button Label</label>
                            <Input
                                value={section.addLabel || ""}
                                onChange={(e) => onUpdate({ ...section, addLabel: e.target.value || undefined })}
                                className="rounded-xl"
                                placeholder="e.g. Add Defect Item"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Min Items</label>
                            <Input
                                type="number"
                                min={0}
                                value={section.minItems ?? ""}
                                onChange={(e) => onUpdate({ ...section, minItems: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Max Items</label>
                            <Input
                                type="number"
                                min={1}
                                value={section.maxItems ?? ""}
                                onChange={(e) => onUpdate({ ...section, maxItems: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Fields ({section.fields.length})
                    </h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={handleAddField}>
                        <PlusIcon className="w-3 h-3 mr-1" />
                        Add Field
                    </Button>
                </div>

                {section.fields.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                        No fields yet. Click &quot;Add Field&quot; to start building this section.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {section.fields.map((field, index) => (
                            <FieldCard
                                key={field.id}
                                field={field}
                                index={index}
                                total={section.fields.length}
                                onEdit={() => handleEditField(index)}
                                onDelete={() => handleDeleteField(index)}
                                onMoveUp={() => handleMoveField(index, "up")}
                                onMoveDown={() => handleMoveField(index, "down")}
                            />
                        ))}
                    </div>
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
