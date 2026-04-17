"use client";

import type { SectionDef } from "@/lib/report-templates/types";
import { FormField } from "./FormField";
import { RepeaterSection } from "./RepeaterSection";

interface FormSectionProps {
    section: SectionDef;
    data: Record<string, unknown> | Record<string, unknown>[];
    onChange: (data: Record<string, unknown> | Record<string, unknown>[]) => void;
    readOnly?: boolean;
    reportId?: string;
    tenantId?: string;
    borderless?: boolean;
}

export function FormSection({ section, data, onChange, readOnly, reportId, tenantId, borderless }: FormSectionProps) {
    if (section.type === "repeater") {
        return (
            <RepeaterSection
                section={section}
                items={(Array.isArray(data) ? data : []) as Record<string, unknown>[]}
                onChange={onChange}
                readOnly={readOnly}
                reportId={reportId}
                tenantId={tenantId}
            />
        );
    }

    const sectionData = (data && !Array.isArray(data) ? data : {}) as Record<string, unknown>;

    const handleFieldChange = (fieldId: string, value: unknown) => {
        onChange({ ...sectionData, [fieldId]: value });
    };

    return (
        <div className={borderless ? "" : "rounded-2xl border border-border bg-card shadow-sm"}>
            <div className={borderless ? "pb-4" : "px-5 py-4 border-b border-border"}>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                )}
            </div>
            <div className={borderless ? "" : "p-5"}>
                <div className="grid grid-cols-2 gap-4">
                    {section.fields.map((field) => {
                        const isHalf = field.width === "half" && field.type !== "heading";
                        return (
                            <div
                                key={field.id}
                                className={isHalf ? "col-span-1" : "col-span-2"}
                            >
                                <FormField
                                    field={field}
                                    value={sectionData[field.id]}
                                    onChange={(value) => handleFieldChange(field.id, value)}
                                    readOnly={readOnly}
                                    reportId={reportId}
                                    sectionId={section.id}
                                    tenantId={tenantId}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
