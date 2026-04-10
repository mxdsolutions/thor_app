import type { TemplateSchema, AutoPopulateKey } from "./types";

export interface JobContext {
    id: string;
    job_title: string;
    description: string | null;
    status: string;
    amount: number | null;
    scheduled_date: string | null;
    company: {
        id: string;
        name: string;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        postcode?: string | null;
    } | null;
}

function resolveValue(key: AutoPopulateKey, job: JobContext): unknown {
    const map: Record<AutoPopulateKey, unknown> = {
        "job.job_title": job.job_title,
        "job.description": job.description,
        "job.status": job.status,
        "job.amount": job.amount,
        "job.scheduled_date": job.scheduled_date,
        "job.company.name": job.company?.name ?? null,
        "job.company.email": job.company?.email ?? null,
        "job.company.phone": job.company?.phone ?? null,
        "job.company.address": job.company?.address ?? null,
        "job.company.postcode": job.company?.postcode ?? null,
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
