const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type PaginationParams = {
    limit: number;
    offset: number;
    search: string | null;
};

/**
 * Parse and validate pagination + search params from a request URL.
 */
export function parsePagination(request: Request): PaginationParams {
    const { searchParams } = new URL(request.url);
    return {
        limit: Math.min(
            Number(searchParams.get("limit")) || DEFAULT_LIMIT,
            MAX_LIMIT
        ),
        offset: Math.max(Number(searchParams.get("offset")) || 0, 0),
        search: searchParams.get("search")?.trim().slice(0, 100) || null,
    };
}
