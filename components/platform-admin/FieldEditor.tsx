"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from "@tabler/icons-react";
import type { FieldDef, FieldType, EntityType, AutoPopulateKey } from "@/lib/report-templates/types";
import { FIELD_TYPE_LABELS, ENTITY_TYPE_LABELS, AUTO_POPULATE_KEYS } from "@/lib/report-templates/types";

interface FieldEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    field: FieldDef | null;
    onSave: (field: FieldDef) => void;
}

const FIELD_TYPES = Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][];

function generateId(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50) || "field";
}

export function FieldEditor({ open, onOpenChange, field, onSave }: FieldEditorProps) {
    const [form, setForm] = useState<FieldDef>({
        id: "",
        label: "",
        type: "text",
        required: false,
        placeholder: "",
        helpText: "",
        options: [],
        width: "full",
        entityType: undefined,
        autoPopulateKey: undefined,
    });

    useEffect(() => {
        if (field) {
            setForm({ ...field, options: field.options || [] });
        } else {
            setForm({
                id: "",
                label: "",
                type: "text",
                required: false,
                placeholder: "",
                helpText: "",
                options: [],
                width: "full",
                entityType: undefined,
                autoPopulateKey: undefined,
            });
        }
    }, [field, open]);

    const isEditing = !!field;
    const showOptions = form.type === "select";
    const showEntityType = form.type === "entity_select";
    const showAutoPopulate = !["heading", "entity_select", "photo_upload"].includes(form.type);
    const compatibleKeys = AUTO_POPULATE_KEYS.filter((k) => k.fieldTypes.includes(form.type));

    const handleLabelChange = (label: string) => {
        const updates: Partial<FieldDef> = { label };
        if (!isEditing) {
            updates.id = generateId(label);
        }
        setForm((f) => ({ ...f, ...updates }));
    };

    const handleAddOption = () => {
        setForm((f) => ({
            ...f,
            options: [...(f.options || []), { label: "", value: "" }],
        }));
    };

    const handleUpdateOption = (index: number, key: "label" | "value", value: string) => {
        setForm((f) => ({
            ...f,
            options: (f.options || []).map((o, i) => {
                if (i !== index) return o;
                const updated = { ...o, [key]: value };
                if (key === "label" && !o.value) {
                    updated.value = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
                }
                return updated;
            }),
        }));
    };

    const handleRemoveOption = (index: number) => {
        setForm((f) => ({
            ...f,
            options: (f.options || []).filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.label.trim() || !form.id.trim()) return;

        const cleaned: FieldDef = {
            id: form.id,
            label: form.label,
            type: form.type,
            width: form.width,
        };
        if (form.required) cleaned.required = true;
        if (form.placeholder) cleaned.placeholder = form.placeholder;
        if (form.helpText) cleaned.helpText = form.helpText;
        if (showOptions && form.options && form.options.length > 0) {
            cleaned.options = form.options.filter((o) => o.label.trim() && o.value.trim());
        }
        if (form.type === "entity_select" && form.entityType) {
            cleaned.entityType = form.entityType;
        }
        if (form.autoPopulateKey) {
            cleaned.autoPopulateKey = form.autoPopulateKey;
        }

        onSave(cleaned);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Field" : "Add Field"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Label *</label>
                            <Input
                                autoFocus
                                placeholder="e.g. Claim Number"
                                value={form.label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Field ID *</label>
                            <Input
                                placeholder="claim_number"
                                value={form.id}
                                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                                className="rounded-xl font-mono text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FieldType }))}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {FIELD_TYPES.map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Width</label>
                            <select
                                value={form.width || "full"}
                                onChange={(e) => setForm((f) => ({ ...f, width: e.target.value as "full" | "half" }))}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="full">Full Width</option>
                                <option value="half">Half Width</option>
                            </select>
                        </div>
                    </div>

                    {showEntityType && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Entity Type *</label>
                            <select
                                value={form.entityType || ""}
                                onChange={(e) => setForm((f) => ({ ...f, entityType: (e.target.value || undefined) as EntityType | undefined }))}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">Select...</option>
                                {(Object.entries(ENTITY_TYPE_LABELS) as [EntityType, string][]).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {showAutoPopulate && compatibleKeys.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Auto-Populate From Job</label>
                            <select
                                value={form.autoPopulateKey || ""}
                                onChange={(e) => setForm((f) => ({ ...f, autoPopulateKey: (e.target.value || undefined) as AutoPopulateKey | undefined }))}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">None</option>
                                {compatibleKeys.map((k) => (
                                    <option key={k.value} value={k.value}>{k.label}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground/60">
                                When a report is linked to a job, this field auto-fills with the selected value.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                        <Input
                            placeholder="Placeholder text..."
                            value={form.placeholder || ""}
                            onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Help Text</label>
                        <Input
                            placeholder="Additional guidance for the user..."
                            value={form.helpText || ""}
                            onChange={(e) => setForm((f) => ({ ...f, helpText: e.target.value }))}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="field-required"
                            checked={form.required || false}
                            onCheckedChange={(checked) => setForm((f) => ({ ...f, required: !!checked }))}
                        />
                        <label htmlFor="field-required" className="text-sm text-muted-foreground cursor-pointer">
                            Required field
                        </label>
                    </div>

                    {showOptions && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Options</label>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddOption}>
                                    <PlusIcon className="w-3 h-3 mr-1" />
                                    Add Option
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {(form.options || []).map((option, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Label"
                                            value={option.label}
                                            onChange={(e) => handleUpdateOption(i, "label", e.target.value)}
                                            className="rounded-xl flex-1"
                                        />
                                        <Input
                                            placeholder="Value"
                                            value={option.value}
                                            onChange={(e) => handleUpdateOption(i, "value", e.target.value)}
                                            className="rounded-xl flex-1 font-mono text-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 shrink-0"
                                            onClick={() => handleRemoveOption(i)}
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                {(!form.options || form.options.length === 0) && (
                                    <p className="text-xs text-muted-foreground py-2 text-center">No options yet. Add at least one.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!form.label.trim() || !form.id.trim()}>
                            {isEditing ? "Save Changes" : "Add Field"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
