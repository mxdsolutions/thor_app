import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePagination, type PaginationParams } from "./pagination";

export type TenantListOptions = {
    /** Postgrest select string (with relations). Defaults to "*". */
    select?: string;
    /** Tenant ID from the auth context. */
    tenantId: string;
    /** Request — used to derive limit/offset/search via parsePagination. */
    request: Request;
    /** Column to order by. Defaults to created_at desc. */
    orderBy?: { column: string; ascending?: boolean; nullsFirst?: boolean };
    /** Columns combined into an `ilike` OR clause when `search` is present. */
    searchColumns?: string[];
};

/**
 * Build a tenant-scoped, paginated SELECT query.
 *
 * Centralises the `.eq("tenant_id", tenantId)` filter so new routes cannot
 * forget it. Returns the query builder so callers can chain extra `.eq()`,
 * `.in()`, etc. before awaiting it.
 *
 * Usage:
 * ```ts
 * const { query, pagination } = tenantListQuery(supabase, "companies", {
 *     select: "*, contacts(id)",
 *     tenantId,
 *     request,
 *     searchColumns: ["name", "email"],
 * });
 * const { data, error, count } = await query.eq("status", "active");
 * ```
 */
export function tenantListQuery(
    supabase: SupabaseClient,
    table: string,
    options: TenantListOptions
) {
    const pagination = parsePagination(options.request);
    const { limit, offset, search } = pagination;
    const order = options.orderBy ?? { column: "created_at", ascending: false };

    let query = supabase
        .from(table)
        .select(options.select ?? "*", { count: "exact" })
        .eq("tenant_id", options.tenantId)
        .order(order.column, {
            ascending: order.ascending ?? false,
            nullsFirst: order.nullsFirst,
        })
        .range(offset, offset + limit - 1);

    if (search && options.searchColumns?.length) {
        const orClause = options.searchColumns
            .map((c) => `${c}.ilike.%${search}%`)
            .join(",");
        query = query.or(orClause);
    }

    return { query, pagination };
}
