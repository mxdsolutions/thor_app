import type { TemplateSchema, AutoPopulateKey } from "./types";

export interface JobContext {
    id: string;
    job_title: string;
    description: string | null;
    status: string;
    amount: number | null;
    scheduled_date: string | null;
    contact: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        postcode?: string | null;
    } | null;
}

function resolveValue(key: AutoPopulateKey, job: JobContext): unknown {
    const contact = job.contact;
    const fullName = contact
        ? [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || null
        : null;

    const map: Record<AutoPopulateKey, unknown> = {
        "job.job_title": job.job_title,
        "job.description": job.description,
        "job.status": job.status,
        "job.amount": job.amount,
        "job.scheduled_date": job.scheduled_date,
        "job.contact.name": fullName,
        "job.contact.first_name": contact?.first_name ?? null,
        "job.contact.last_name": contact?.last_name ?? null,
        "job.contact.email": contact?.email ?? null,
        "job.contact.phone": contact?.phone ?? null,
        "job.contact.address": contact?.address ?? null,
        "job.contact.postcode": contact?.postcode ?? null,
    };
    return map[key] ?? null;
}

function isEmpty(value: unknown): boolean {
    return value === undefined || value === null || value === "";
}

/**
 * Pre-fills empty fields that have an autoPopulateKey with data from the linked job.
 * Does not overwrite user-entered data. Skips repeater sections.
 * Returns a new data object — does not mutate the input.
 */
export function buildAutoPopulatedData(
    schema: TemplateSchema,
    job: JobContext,
    existingData: Record<string, unknown>
): Record<string, unknown> {
    const result = { ...existingData };

    for (const section of schema.sections) {
        if (section.type === "repeater") continue;

        const sectionData = (result[section.id] as Record<string, unknown>) || {};
        let changed = false;

        const newSectionData = { ...sectionData };
        for (const field of section.fields) {
            if (!field.autoPopulateKey) continue;
            if (!isEmpty(newSectionData[field.id])) continue;

            const value = resolveValue(field.autoPopulateKey, job);
            if (value !== null && value !== undefined) {
                newSectionData[field.id] = value;
                changed = true;
            }
        }

        if (changed) {
            result[section.id] = newSectionData;
        }
    }

    return result;
}
