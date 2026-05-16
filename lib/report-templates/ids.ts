/**
 * ID and slug generation for report templates.
 *
 * Two slug shapes intentionally co-exist:
 *  - **Hyphens** (`slugifyHyphen`) for the URL-safe `report_templates.slug`
 *    column. Matches the validation regex in lib/validation.ts —
 *    `^[a-z0-9][a-z0-9-]*[a-z0-9]$`. The caller is responsible for handling
 *    the empty-output case (input was all non-alphanumeric) since that would
 *    fail validation downstream.
 *  - **Underscores** (`slugifyUnderscore`) for section / field IDs inside the
 *    schema. These are not URL-facing; underscores read better in field-id
 *    contexts like `job.contact.email` and avoid ambiguity with PostgREST
 *    operator separators.
 *
 * Both implementations were previously inlined across BuilderShell,
 * BuilderCanvas, and CreateReportTemplateModal with subtle drift between
 * separators. Centralise here so the contract is impossible to forget.
 */

/** Slug for template URLs and the unique `report_templates.slug` column. */
export function slugifyHyphen(input: string, maxLength = 100): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, maxLength);
}

/** Identifier for sections and fields inside a template schema. */
export function slugifyUnderscore(input: string, maxLength = 50): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, maxLength);
}

/**
 * Append `_2`, `_3`, … until the id doesn't collide with an existing one.
 * Used when adding a new field/section and after schema-wide dedup at save.
 */
export function dedupeId(id: string, existing: Set<string> | ReadonlySet<string>): string {
    if (!existing.has(id)) return id;
    let suffix = 2;
    while (existing.has(`${id}_${suffix}`)) suffix++;
    return `${id}_${suffix}`;
}

/**
 * Slugify a label into a section/field id, dedup against existing ids, and
 * fall back to a non-colliding sentinel if the label slugs to empty.
 *
 * The fallback uses a short random suffix rather than `Date.now()` — rapid
 * clicks could otherwise produce the same millisecond, relying on dedup to
 * fix what shouldn't have collided in the first place.
 */
export function generateSectionId(
    label: string,
    existing: Set<string> | ReadonlySet<string> = new Set(),
): string {
    const slug = slugifyUnderscore(label) || `section_${randomShortId()}`;
    return dedupeId(slug, existing);
}

function randomShortId(): string {
    // crypto.randomUUID is available in all supported runtimes (modern
    // browsers, Node 19+). 8 hex chars = 4 billion permutations — plenty
    // for an "unlabelled section" disambiguator.
    return crypto.randomUUID().slice(0, 8);
}
