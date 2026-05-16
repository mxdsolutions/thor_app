import type { FieldDef, SectionDef, TemplateSchema } from "./types";

/**
 * Generate a plausible-looking fake submission for a template schema. Used by
 * the in-builder "Preview as PDF" button so platform admins can eyeball the
 * final PDF without needing a real submitted report.
 *
 * Per section type:
 *   - "standard"  → one object keyed by field id
 *   - "repeater"  → two sample entries so repeater layout (#1 / #2 cards)
 *                   is visible in the preview.
 */
export function generateFakeReportData(schema: TemplateSchema): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const section of schema.sections) {
        if (section.type === "repeater") {
            data[section.id] = [
                fakeSectionValues(section, 0),
                fakeSectionValues(section, 1),
            ];
        } else {
            data[section.id] = fakeSectionValues(section, 0);
        }
    }
    return data;
}

function fakeSectionValues(section: SectionDef, itemIndex: number): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const field of section.fields) {
        const v = fakeValueForField(field, itemIndex);
        if (v !== undefined) values[field.id] = v;
    }
    return values;
}

const TEXT_SAMPLES = [
    "Sample answer",
    "Inspected and recorded",
    "Within tolerance",
    "Awaiting follow-up",
];

const TEXTAREA_SAMPLES = [
    "Visible damage to the southern wall, approximately 1.2m × 0.8m. Cause appears to be water ingress from the adjacent gutter. Recommend rectification once weather permits.",
    "All accessible roof tiles inspected — no broken or displaced tiles observed. Flashing intact around chimney and skylights.",
];

function fakeValueForField(field: FieldDef, seed: number): unknown {
    switch (field.type) {
        case "text":
            return TEXT_SAMPLES[seed % TEXT_SAMPLES.length];

        case "textarea":
            return TEXTAREA_SAMPLES[seed % TEXTAREA_SAMPLES.length];

        case "number":
            return 42 + seed;

        case "currency":
            return 1234.56 + seed * 100;

        case "date":
            return new Date().toISOString().slice(0, 10);

        case "select":
            // Pick the first option that has a value, falling back to "".
            return field.options?.[0]?.value ?? "";

        case "yes_no":
            return seed % 2 === 0 ? "yes" : "no";

        case "checkbox":
            return true;

        case "photo_upload":
            // Real photos would require uploaded files — leave empty so the
            // PDF renders a "no photos" state cleanly.
            return [];

        case "entity_select":
            return { id: "preview", label: `Sample ${field.entityType ?? "record"}` };

        case "heading":
            // Headings don't carry data.
            return undefined;

        default:
            return undefined;
    }
}
