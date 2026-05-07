import { NextResponse } from "next/server";
import { withAuth } from "./handler";
import { archiveActionSchema } from "@/lib/validation";
import { validationError, missingParamError, notFoundError, serverError } from "./errors";

/** List filter scope for archivable entities. */
export type ArchiveScope = "active" | "archived" | "all";

/**
 * Read the `archive` query param and coerce it into a scope.
 * Defaults to `active` so default list views hide archived rows.
 */
export function parseArchiveScope(request: Request): ArchiveScope {
    const value = new URL(request.url).searchParams.get("archive");
    return value === "archived" || value === "all" ? value : "active";
}

// Minimal shape of the postgrest builder methods we need. Avoids depending on
// the specific generic signature of `PostgrestFilterBuilder`, which has shifted
// across @supabase/postgrest-js versions.
type ArchiveFilterableBuilder<Q> = {
    is(column: string, value: null): Q;
    not(column: string, operator: "is", value: null): Q;
};

/**
 * Apply the archive filter for the given scope to a Postgrest query builder.
 * No-op for `all`. Returns the chained builder so calls can keep flowing.
 *
 * Usage:
 * ```ts
 * let q = supabase.from("jobs").select(...).eq("tenant_id", tenantId);
 * q = applyArchiveFilter(q, parseArchiveScope(request));
 * ```
 */
export function applyArchiveFilter<Q extends ArchiveFilterableBuilder<Q>>(
    query: Q,
    scope: ArchiveScope
): Q {
    if (scope === "active") return query.is("archived_at", null);
    if (scope === "archived") return query.not("archived_at", "is", null);
    return query;
}

/**
 * Build a PATCH archive route handler for `app/api/{entity}/[id]/archive/route.ts`.
 * Sets/clears `archived_at` on the row; the entity's main PATCH schema stays
 * focused on its own fields.
 *
 * Expects the dynamic id to be the second-to-last URL segment, e.g.
 * `/api/jobs/123/archive` → id = "123".
 *
 * `options.pkColumn` defaults to "id" — override for tables with non-standard
 * primary keys (e.g. pricing uses "Matrix_ID"). `options.touchUpdatedAt`
 * defaults to true; turn off for tables that lack an `updated_at` column.
 */
export function buildArchiveHandler(
    table: string,
    entityName: string,
    options: { pkColumn?: string; touchUpdatedAt?: boolean } = {}
) {
    const pkColumn = options.pkColumn ?? "id";
    const touchUpdatedAt = options.touchUpdatedAt ?? true;

    return withAuth(async (request, { supabase, tenantId }) => {
        const segments = request.nextUrl.pathname.split("/");
        // Last segment is "archive"; the id sits one before it.
        const id = segments.at(-2);
        if (!id) return missingParamError("id");

        const body = await request.json().catch(() => ({}));
        const validation = archiveActionSchema.safeParse(body);
        if (!validation.success) return validationError(validation.error);

        const archived_at = validation.data.archived ? new Date().toISOString() : null;
        const update: Record<string, string | null> = { archived_at };
        if (touchUpdatedAt) update.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from(table)
            .update(update)
            .eq(pkColumn, id)
            .eq("tenant_id", tenantId)
            .select(`${pkColumn}, archived_at`)
            .single();

        if (error) return serverError(error);
        if (!data) return notFoundError(entityName);

        return NextResponse.json({ item: data });
    });
}
