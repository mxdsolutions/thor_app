"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldDef, PhotoItem } from "@/lib/report-templates/types";
import { PhotoUploadField } from "./PhotoUploadField";
import { EntitySelectField } from "./EntitySelectField";

interface FormFieldProps {
    field: FieldDef;
    value: unknown;
    onChange: (value: unknown) => void;
    readOnly?: boolean;
    reportId?: string;
    sectionId?: string;
    tenantId?: string;
}

export function FormField({ field, value, onChange, readOnly, reportId, sectionId, tenantId }: FormFieldProps) {
    if (field.type === "heading") {
        return (
            <div className="col-span-2 pt-2">
                <h4 className="text-lg font-semibold text-foreground">{field.label}</h4>
                {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
            </div>
        );
    }

    const fieldLabel = (
        <label className="text-xs font-medium text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    );

    const helpText = field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
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
                        readOnly={readOnly}
                    />
                    {helpText}
                </div>
            );

        case "textarea":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <textarea
                        placeholder={field.placeholder}
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        rows={4}
                        readOnly={readOnly}
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[80px]"
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
                        readOnly={readOnly}
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
                            readOnly={readOnly}
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
                        readOnly={readOnly}
                    />
                    {helpText}
                </div>
            );

        case "select":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <select
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={readOnly}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="">{field.placeholder || "Select..."}</option>
                        {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {helpText}
                </div>
            );

        case "yes_no":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => !readOnly && onChange("yes")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                                value === "yes"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                                    : "border-border hover:border-foreground/30 text-muted-foreground"
                            }`}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => !readOnly && onChange("no")}
                            className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                                value === "no"
                                    ? "bg-red-500/10 border-red-500/30 text-red-700"
                                    : "border-border hover:border-foreground/30 text-muted-foreground"
                            }`}
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
                            onCheckedChange={(checked) => !readOnly && onChange(!!checked)}
                            disabled={readOnly}
                        />
                        <label className="text-sm text-foreground cursor-pointer">{field.label}</label>
                    </div>
                    {helpText}
                </div>
            );

        case "photo_upload":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <PhotoUploadField
                        photos={(value as PhotoItem[]) || []}
                        onChange={onChange}
                        readOnly={readOnly}
                        reportId={reportId}
                        sectionId={sectionId}
                        fieldId={field.id}
                        tenantId={tenantId}
                    />
                    {helpText}
                </div>
            );

        case "entity_select":
            return (
                <div className="space-y-1.5">
                    {fieldLabel}
                    <EntitySelectField
                        entityType={field.entityType || "job"}
                        value={value as { id: string; label: string } | null}
                        onChange={onChange}
                        placeholder={field.placeholder}
                        readOnly={readOnly}
                    />
                    {helpText}
                </div>
            );

        default:
            return null;
    }
}
