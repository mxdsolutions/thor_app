"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface DetailField {
    label: string;
    value: React.ReactNode;
    /** Database column name — if set, the field is editable */
    dbColumn?: string;
    /** Input type for editing */
    type?: "text" | "number" | "date" | "select" | "textarea";
    /** Options for select fields */
    options?: { value: string; label: string }[];
    /** Raw value used for editing (string/number), separate from the display ReactNode */
    rawValue?: string | number | null;
}

interface DetailFieldsProps {
    fields: DetailField[];
    className?: string;
    /** Called when a field value is changed. Should persist to DB. */
    onSave?: (dbColumn: string, value: string | number | null) => Promise<void>;
}

function EditableValue({
    field,
    onSave,
}: {
    field: DetailField;
    onSave?: (dbColumn: string, value: string | number | null) => Promise<void>;
}) {
    const raw = field.rawValue ?? (typeof field.value === "string" || typeof field.value === "number" ? field.value : null);
    const [editing, setEditing] = useState(false);
    const [localValue, setLocalValue] = useState(String(raw ?? ""));
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        setLocalValue(String(raw ?? ""));
    }, [raw]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select();
            }
        }
    }, [editing]);

    const commit = useCallback(async () => {
        setEditing(false);
        if (!field.dbColumn || !onSave) return;
        const trimmed = localValue.trim();
        const newVal = trimmed === "" ? null : field.type === "number" ? Number(trimmed) : trimmed;
        const oldVal = raw === null || raw === undefined ? null : field.type === "number" ? Number(raw) : String(raw);
        if (newVal === oldVal || (newVal === null && oldVal === null)) return;
        setSaving(true);
        try {
            await onSave(field.dbColumn, newVal);
        } finally {
            setSaving(false);
        }
    }, [localValue, raw, field.dbColumn, field.type, onSave]);

    // Select fields
    if (field.type === "select" && field.options && field.dbColumn) {
        return (
            <Select
                value={String(raw ?? "__none__")}
                onValueChange={async (val) => {
                    if (!onSave || !field.dbColumn) return;
                    setSaving(true);
                    try {
                        await onSave(field.dbColumn, val === "__none__" ? null : val);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <SelectTrigger className={cn(
                    "h-auto py-1 px-2.5 border-0 bg-transparent text-[15px] text-foreground text-right justify-end gap-1 min-w-0 shadow-none focus:ring-0 focus:ring-offset-0 hover:bg-muted/50 rounded-lg transition-colors -mr-2",
                    saving && "opacity-50"
                )}>
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">
                        <span className="text-muted-foreground">None</span>
                    </SelectItem>
                    {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    // Non-editable fields
    if (!field.dbColumn || !onSave) {
        return (
            <span className={cn(
                "text-[15px] text-foreground min-w-0",
                field.type === "textarea" ? "whitespace-pre-wrap text-left w-full" : "truncate",
                field.type !== "textarea" && (!field.label ? "text-left" : "text-right"),
            )}>
                {field.value || <span className="text-muted-foreground/40">&mdash;</span>}
            </span>
        );
    }

    // Editable text/number/date
    if (editing) {
        const isLabelless = !field.label;
        const sharedClasses = cn("text-[15px] text-foreground bg-muted/40 border border-border rounded-lg py-1.5 px-2.5 min-w-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-shadow", isLabelless ? "text-left" : "text-right");
        if (field.type === "textarea") {
            return (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") { setLocalValue(String(raw ?? "")); setEditing(false); }
                    }}
                    rows={2}
                    className={cn(sharedClasses, "w-full resize-none")}
                />
            );
        }
        return (
            <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") { setLocalValue(String(raw ?? "")); setEditing(false); }
                }}
                className={cn(sharedClasses, "w-32")}
            />
        );
    }

    const isTextarea = field.type === "textarea";
    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
                "text-[15px] text-foreground min-w-0 hover:bg-muted/50 rounded-md px-1.5 py-0.5 transition-colors cursor-text",
                isTextarea ? "whitespace-pre-wrap text-left w-full -ml-1.5" : "truncate",
                !isTextarea && (!field.label ? "text-left -ml-1.5" : "text-right -mr-1.5"),
                saving && "opacity-50"
            )}
        >
            {field.value || <span className="text-muted-foreground/40 italic text-sm">Click to add</span>}
        </button>
    );
}

export function DetailFields({ fields, className, onSave }: DetailFieldsProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {fields.map((field, i) => (
                <div key={i} className={field.label ? "flex items-start justify-between gap-4" : ""}>
                    {field.label && (
                        <span className="text-sm font-medium text-muted-foreground shrink-0 pt-1">
                            {field.label}
                        </span>
                    )}
                    <EditableValue field={field} onSave={onSave} />
                </div>
            ))}
        </div>
    );
}

import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";
import type { EntityPreviewType } from "@/lib/swr";

interface EntityCardProps {
    label: string;
    title: string;
    subtitle?: string | null;
    icon?: React.ReactNode;
    /** When provided alongside entityId, the card becomes hover/tap-interactive
     *  with a preview popover and a "View more" button that opens the related
     *  entity in a stacked side sheet. */
    entityType?: EntityPreviewType;
    entityId?: string | null;
}

export function LinkedEntityCard({ label, title, subtitle, icon, entityType, entityId }: EntityCardProps) {
    const inner = (
        <div
            className={cn(
                "rounded-xl border border-border bg-card p-3",
                entityType && entityId && "hover:bg-muted/30 transition-colors cursor-pointer",
            )}
        >
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">
                {label}
            </p>
            <div className="flex items-center gap-2.5">
                {icon && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-foreground truncate">{title}</p>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );

    if (entityType && entityId) {
        return (
            <EntityPreviewCard entityType={entityType} entityId={entityId} className="block w-full">
                {inner}
            </EntityPreviewCard>
        );
    }
    return inner;
}
