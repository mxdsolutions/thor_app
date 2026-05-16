import type { SectionDef, TemplateSchema } from "./types";

/**
 * The schema version we currently know how to render and persist. Bump when
 * shipping a v2 schema and provide a migration helper alongside.
 *
 * Cross-references: `version: z.literal(1)` in lib/validation.ts, the version
 * check in app/platform-admin/builder/[id]/page.tsx. All three must agree.
 */
export const LATEST_SCHEMA_VERSION = 1 as const;

/** Build a fresh empty starter section. Each call returns a new object. */
export function buildStarterSection(): SectionDef {
    return { id: "section_1", title: "Section 1", type: "standard", fields: [] };
}

/**
 * The shape new templates start with — one empty "Section 1". Used as the
 * server-side default for POST routes when the client doesn't supply a schema,
 * and as the seed inside BuilderShell when a template loads with zero sections.
 *
 * Returns a fresh schema on every call so callers can mutate without polluting
 * the constant.
 */
export function buildEmptyTemplateSchema(): TemplateSchema {
    return {
        version: LATEST_SCHEMA_VERSION,
        sections: [buildStarterSection()],
    };
}
