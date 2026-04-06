import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError } from "@/app/api/_lib/errors";

export const GET = withAuth(async (request: NextRequest, { supabase }) => {
    const id = request.nextUrl.pathname.split("/").pop();

    const { data, error } = await supabase
        .from("jobs")
        .select(`
            *,
            project:projects!jobs_project_id_fkey (
                id,
                title
            ),
            assignees:job_assignees (
                user:profiles (
                    id,
                    full_name,
                    email
                )
            ),
            lead:leads!jobs_opportunity_id_fkey (
                id,
                title
            ),
            company:companies (
                id,
                name
            )
        `)
        .eq("id", id)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        return serverError();
    }

    const job = {
        ...data,
        assignees: ((data.assignees || []) as { user: unknown }[]).map((a) => a.user).filter(Boolean),
    };

    return NextResponse.json({ item: job });
});
