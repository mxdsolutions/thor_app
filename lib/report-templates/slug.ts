import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

/**
 * Thrown by `insertTemplateWithUniqueSlug` when every suffix attempt collided
 * with an existing row. Callers can `instanceof` this to distinguish a true
 * exhaustion from an ordinary Postgres error.
 */
export class SlugExhaustedError extends Error {
    readonly baseSlug: string;
    readonly attempts: number;

    constructor(baseSlug: string, attempts: number) {
        super(`Could not find a unique slug for "${baseSlug}" after ${attempts} attempts`);
        this.name = "SlugExhaustedError";
        this.baseSlug = baseSlug;
        this.attempts = attempts;
    }
}

type InsertResult<Row> =
    | { data: Row; error: null }
    | { data: null; error: PostgrestError };

/**
 * Insert a report template, auto-uniquifying the slug on collisions.
 *
 * First attempt uses the requested slug. If Postgres returns a unique-violation
 * (`23505`), retry with `${slug}-2`, `${slug}-3`, … up to `maxAttempts`. The
 * row returned by `.select().single()` reflects the final slug actually used.
 *
 * Atomic-by-retry: each attempt is its own INSERT, so the unique constraint
 * itself adjudicates races. No pre-check / read-then-write window.
 *
 * Throws {@link SlugExhaustedError} if `maxAttempts` is reached without a
 * non-colliding slug. Non-collision Postgres errors are returned in the
 * `error` field for the caller to map to a 500.
 */
export async function insertTemplateWithUniqueSlug<Row = unknown>(
    adminClient: SupabaseClient,
    insertData: Record<string, unknown> & { slug: string },
    maxAttempts = 50,
): Promise<InsertResult<Row>> {
    const baseSlug = insertData.slug;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
        const result = await adminClient
            .from("report_templates")
            .insert({ ...insertData, slug })
            .select()
            .single();
        if (!result.error) return result as InsertResult<Row>;
        // 23505 = unique_violation → try the next suffix.
        if (result.error.code !== "23505") return result as InsertResult<Row>;
    }
    throw new SlugExhaustedError(baseSlug, maxAttempts);
}
