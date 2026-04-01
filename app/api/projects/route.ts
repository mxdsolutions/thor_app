import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (_request, { supabase }) => {
    const { data, error } = await supabase
        .from("projects")
        .select(`
            *,
            client:profiles!projects_client_id_fkey (
                id,
                full_name,
                email
            )
        `)
        .order("created_at", { ascending: false });

    if (error) return serverError();

    return NextResponse.json({ projects: data });
});
