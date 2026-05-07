import type { TemplateSchema, FieldDef, SectionDef, PhotoItem } from "@/lib/report-templates/types";

export type SubmissionValidationError = {
    section: string;
    field?: string;
    message: string;
};

const FIELD_VALIDATORS: Record<FieldDef["type"], (value: unknown, field: FieldDef) => string | null> = {
    heading: () => null,
    text: (v) => (typeof v === "string" || v == null ? null : "must be a string"),
    textarea: (v) => (typeof v === "string" || v == null ? null : "must be a string"),
    number: (v) => (typeof v === "number" || v == null ? null : "must be a number"),
    currency: (v) => (typeof v === "number" || v == null ? null : "must be a number"),
    date: (v) => {
        if (v == null || v === "") return null;
        if (typeof v !== "string") return "must be a date string";
        return Number.isNaN(Date.parse(v)) ? "must be a valid date" : null;
    },
    select: (v, f) => {
        if (v == null || v === "") return null;
        if (typeof v !== "string") return "must be a string";
        const allowed = f.options?.map((o) => o.value) ?? [];
        if (allowed.length === 0) return null;
        return allowed.includes(v) ? null : "must be one of the allowed options";
    },
    yes_no: (v) => {
        if (v == null || v === "") return null;
        return v === "yes" || v === "no" ? null : "must be 'yes' or 'no'";
    },
    checkbox: (v) => (typeof v === "boolean" || v == null ? null : "must be true or false"),
    photo_upload: (v) => {
        if (v == null) return null;
        if (!Array.isArray(v)) return "must be a list of photos";
        for (const item of v as unknown[]) {
            if (!item || typeof item !== "object") return "invalid photo entry";
            const p = item as Partial<PhotoItem>;
            if (typeof p.url !== "string" || typeof p.filename !== "string") {
                return "photo entries must have url and filename";
            }
        }
        return null;
    },
    entity_select: (v) => {
        if (v == null || v === "") return null;
        return typeof v === "string" ? null : "must be an id string";
    },
};

function isEmpty(v: unknown): boolean {
    if (v === null || v === undefined || v === "") return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
}

function validateSectionData(
    section: SectionDef,
    rawData: unknown,
    errors: SubmissionValidationError[],
): void {
    if (section.type === "repeater") {
        const items = Array.isArray(rawData) ? rawData : [];
        if (section.minItems && items.length < section.minItems) {
            errors.push({
                section: section.id,
                message: `requires at least ${section.minItems} item${section.minItems === 1 ? "" : "s"}`,
            });
        }
        if (section.maxItems && items.length > section.maxItems) {
            errors.push({
                section: section.id,
                message: `allows at most ${section.maxItems} items`,
            });
        }
        items.forEach((rawItem, i) => {
            if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
                errors.push({ section: section.id, message: `item ${i + 1} is not an object` });
                return;
            }
            const item = rawItem as Record<string, unknown>;
            for (const field of section.fields) {
                if (field.type === "heading") continue;
                const value = item[field.id];
                if (field.required && isEmpty(value)) {
                    errors.push({
                        section: section.id,
                        field: field.id,
                        message: `item ${i + 1}: ${field.label} is required`,
                    });
                    continue;
                }
                const err = FIELD_VALIDATORS[field.type](value, field);
                if (err) errors.push({ section: section.id, field: field.id, message: `item ${i + 1}: ${field.label} ${err}` });
            }
        });
        return;
    }

    const sectionData = (rawData && typeof rawData === "object" && !Array.isArray(rawData)
        ? (rawData as Record<string, unknown>)
        : {});

    for (const field of section.fields) {
        if (field.type === "heading") continue;
        const value = sectionData[field.id];
        if (field.required && isEmpty(value)) {
            errors.push({
                section: section.id,
                field: field.id,
                message: `${field.label} is required`,
            });
            continue;
        }
        const err = FIELD_VALIDATORS[field.type](value, field);
        if (err) errors.push({ section: section.id, field: field.id, message: `${field.label} ${err}` });
    }
}

/** Walk the template schema and validate the submitted data:
 *   - required fields are filled,
 *   - field types match (number, date, enum, photo array shape, etc.),
 *   - repeater min/max bounds respected.
 *
 *  Unknown sections / unknown field IDs are dropped silently — this is data
 *  hygiene, not a security boundary. The server still strictly controls what
 *  rows the data writes to via the token row.
 */
export function validateReportSubmission(
    schema: TemplateSchema,
    data: Record<string, unknown>,
): SubmissionValidationError[] {
    const errors: SubmissionValidationError[] = [];
    for (const section of schema.sections) {
        validateSectionData(section, data[section.id], errors);
    }
    return errors;
}
