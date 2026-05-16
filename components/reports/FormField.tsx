"use client";

import { useEffect, useRef } from "react";
import { Image as PhotoIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FieldDef, PhotoItem } from "@/lib/report-templates/types";
import { PhotoUploadField } from "./PhotoUploadField";
import { EntitySelectField } from "./EntitySelectField";

export type FormFieldMode = "fill" | "preview" | "edit";

interface FormFieldProps {
    field: FieldDef;
    value: unknown;
    onChange: (value: unknown) => void;
    readOnly?: boolean;
    reportId?: string;
    sectionId?: string;
    tenantId?: string;
    /**
     * "fill" — interactive (default, used at /r/[token]).
     * "preview" — read-only, no editing affordances. Used to show "what the tradie will see".
     * "edit" — read-only inputs + inline-editable label + help text. Used by the builder canvas.
     */
    mode?: FormFieldMode;
    /** Edit-mode: called when the user edits the label or help text. */
    onFieldChange?: (updates: Partial<FieldDef>) => void;
    /** Edit-mode: auto-focus the label input on mount (used for newly added questions). */
    autoFocusLabel?: boolean;
}

export function FormField({
    field,
    value,
    onChange,
    readOnly,
    reportId,
    sectionId,
    tenantId,
    mode = "fill",
    onFieldChange,
    autoFocusLabel,
}: FormFieldProps) {
    const isEdit = mode === "edit";
    const inputsReadOnly = readOnly || mode === "preview" || mode === "edit";

    if (field.type === "heading") {
        return (
            <div className="col-span-2 pt-2">
                <EditableTitleLine
                    field={field}
                    mode={mode}
                    onFieldChange={onFieldChange}
                    autoFocus={autoFocusLabel}
                />
                <EditableHelpText field={field} mode={mode} onFieldChange={onFieldChange} />
            </div>
        );
    }

    const fieldLabel = (
        <EditableLabel
            field={field}
            mode={mode}
            onFieldChange={onFieldChange}
            autoFocus={autoFocusLabel}
        />
    );

    const helpText = (
        <EditableHelpText field={field} mode={mode} onFieldChange={onFieldChange} />
    );

    switch (field.type) {
        case "text":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <Input
                        placeholder={field.placeholder}
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="rounded-xl"
                        readOnly={inputsReadOnly}
                        tabIndex={isEdit ? -1 : undefined}
                    />
                    {helpText}
                </div>
            );

        case "textarea":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <Textarea
                        placeholder={field.placeholder}
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        rows={4}
                        readOnly={inputsReadOnly}
                        tabIndex={isEdit ? -1 : undefined}
                        className="rounded-xl resize-y"
                    />
                    {helpText}
                </div>
            );

        case "number":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={value !== undefined && value !== null ? String(value) : ""}
                        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className="rounded-xl"
                        readOnly={inputsReadOnly}
                        tabIndex={isEdit ? -1 : undefined}
                    />
                    {helpText}
                </div>
            );

        case "currency":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder={field.placeholder || "0.00"}
                            value={value !== undefined && value !== null ? String(value) : ""}
                            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            className="rounded-xl pl-7"
                            readOnly={inputsReadOnly}
                            tabIndex={isEdit ? -1 : undefined}
                        />
                    </div>
                    {helpText}
                </div>
            );

        case "date":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <Input
                        type="date"
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="rounded-xl"
                        readOnly={inputsReadOnly}
                        tabIndex={isEdit ? -1 : undefined}
                    />
                    {helpText}
                </div>
            );

        case "select": {
            const options = field.options || [];
            const selectedLabel =
                options.find((opt) => opt.value === value)?.label ?? null;
            // Radix Select doesn't model `readOnly` — only `disabled`, which
            // greys the trigger and disables interactions visually. For
            // preview / edit modes we want the trigger to look identical to
            // a live one (consistent with the wizard) but reject input. A
            // static display matches the trigger's chrome via the same
            // classes and side-steps Radix's disabled styling entirely.
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    {inputsReadOnly ? (
                        <div
                            className="flex h-10 w-full items-center rounded-xl border border-border/50 bg-background px-3 text-base"
                            aria-disabled="true"
                        >
                            {selectedLabel ?? (
                                <span className="text-muted-foreground">
                                    {field.placeholder || "Select..."}
                                </span>
                            )}
                        </div>
                    ) : (
                        <Select
                            value={(value as string) || undefined}
                            onValueChange={(v) => onChange(v)}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={field.placeholder || "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {helpText}
                </div>
            );
        }

        case "yes_no":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => !inputsReadOnly && onChange("yes")}
                            tabIndex={isEdit ? -1 : undefined}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors",
                                value === "yes"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                                    : "border-border text-muted-foreground",
                                !inputsReadOnly && "hover:border-foreground/30",
                            )}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => !inputsReadOnly && onChange("no")}
                            tabIndex={isEdit ? -1 : undefined}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors",
                                value === "no"
                                    ? "bg-red-500/10 border-red-500/30 text-red-700"
                                    : "border-border text-muted-foreground",
                                !inputsReadOnly && "hover:border-foreground/30",
                            )}
                        >
                            No
                        </button>
                    </div>
                    {helpText}
                </div>
            );

        case "checkbox":
            return (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={!!value}
                            onCheckedChange={(checked) => !inputsReadOnly && onChange(!!checked)}
                            disabled={inputsReadOnly}
                        />
                        {isEdit ? (
                            <InlineEditableInput
                                value={field.label}
                                onChange={(v) => onFieldChange?.({ label: v })}
                                placeholder="Question"
                                autoFocus={autoFocusLabel}
                                className="text-sm text-foreground"
                            />
                        ) : (
                            <label className="text-sm text-foreground cursor-pointer">{field.label}</label>
                        )}
                    </div>
                    {helpText}
                </div>
            );

        case "photo_upload": {
            const photos = (value as PhotoItem[]) || [];
            const showPlaceholder = mode !== "fill" && photos.length === 0;
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    {showPlaceholder ? (
                        <div className="grid grid-cols-3 gap-2 max-w-md">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-[4/3] rounded-md border border-dashed border-border/60 bg-secondary/20 flex items-center justify-center"
                                >
                                    <PhotoIcon className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <PhotoUploadField
                            photos={photos}
                            onChange={onChange}
                            readOnly={inputsReadOnly}
                            sectionId={sectionId}
                            fieldId={field.id}
                        />
                    )}
                    {helpText}
                </div>
            );
        }

        case "entity_select":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <EntitySelectField
                        entityType={field.entityType || "job"}
                        value={value as { id: string; label: string } | null}
                        onChange={onChange}
                        placeholder={field.placeholder}
                        readOnly={inputsReadOnly}
                    />
                    {helpText}
                </div>
            );

        default:
            return null;
    }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers — editable label / help text / heading            */
/* ------------------------------------------------------------------ */

interface EditableLabelProps {
    field: FieldDef;
    mode: FormFieldMode;
    onFieldChange?: (updates: Partial<FieldDef>) => void;
    autoFocus?: boolean;
}

function EditableLabel({ field, mode, onFieldChange, autoFocus }: EditableLabelProps) {
    if (mode === "edit") {
        return (
            <div className="flex items-baseline gap-1">
                <InlineEditableInput
                    value={field.label}
                    onChange={(v) => onFieldChange?.({ label: v })}
                    placeholder="Question"
                    autoFocus={autoFocus}
                    className="text-xs font-medium text-muted-foreground"
                />
                {field.required && <span className="text-red-500 text-xs shrink-0">*</span>}
            </div>
        );
    }
    return (
        <label className="text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    );
}

function EditableTitleLine({ field, mode, onFieldChange, autoFocus }: EditableLabelProps) {
    if (mode === "edit") {
        return (
            <InlineEditableInput
                value={field.label}
                onChange={(v) => onFieldChange?.({ label: v })}
                placeholder="Heading text"
                autoFocus={autoFocus}
                className="text-lg font-semibold text-foreground"
            />
        );
    }
    return <h4 className="text-lg font-semibold text-foreground">{field.label}</h4>;
}

interface EditableHelpTextProps {
    field: FieldDef;
    mode: FormFieldMode;
    onFieldChange?: (updates: Partial<FieldDef>) => void;
}

function EditableHelpText({ field, mode, onFieldChange }: EditableHelpTextProps) {
    if (mode === "edit") {
        return (
            <InlineEditableInput
                value={field.helpText || ""}
                onChange={(v) => onFieldChange?.({ helpText: v || undefined })}
                placeholder="Add help text (optional)"
                className="text-[11px] text-muted-foreground mt-1"
            />
        );
    }
    if (!field.helpText) return null;
    return <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>;
}

interface InlineEditableInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoFocus?: boolean;
    className?: string;
}

function InlineEditableInput({ value, onChange, placeholder, autoFocus, className }: InlineEditableInputProps) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus && ref.current) {
            ref.current.focus();
            ref.current.select();
        }
    }, [autoFocus]);

    return (
        <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
                "w-full bg-transparent border-none focus:outline-none focus:ring-0 px-0 placeholder:text-muted-foreground/40",
                className,
            )}
        />
    );
}
