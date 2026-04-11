const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type PaginationParams = {
    limit: number;
    offset: number;
    search: string | null;
};

/**
 * Parse and validate pagination + search params from a request URL.
 *
 * `search` is sanitised so it's safe to interpolate into a PostgREST `.or(...)`
 * filter expression: commas separate filters, parens group them, backslash is
 * the escape character. None of those are useful inside a product/contact
 * search term, so we strip them rather than try to escape them.
 */
export function parsePagination(request: Request): PaginationParams {
    const { searchParams } = new URL(request.url);
    const rawSearch = searchParams.get("search")?.trim().slice(0, 100);
    const sanitised = rawSearch?.replace(/[,()\\]/g, " ").trim();
    return {
        limit: Math.min(
            Number(searchParams.get("limit")) || DEFAULT_LIMIT,
            MAX_LIMIT
        ),
        offset: Math.max(Number(searchParams.get("offset")) || 0, 0),
        search: sanitised || null,
    };
}
