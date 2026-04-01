import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request, { supabase }) => {
    const { limit, offset, search } = parsePagination(request);
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");

    let query = supabase
        .from("pricing")
        .select("*", { count: "exact" })
        .order("Trade", { ascending: true })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(
            `Item.ilike.%${search}%,Trade.ilike.%${search}%,Category.ilike.%${search}%`
        );
    }

    if (trade) {
        query = query.eq("Trade", trade);
    }

    const { data, error, count } = await query;
    if (error) return serverError();

    return NextResponse.json({ items: data, total: count || 0 });
});
