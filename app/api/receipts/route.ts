import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { receiptSchema } from "@/lib/validation";

const RECEIPT_SELECT =
    "*, file:files (id, name, storage_path, mime_type, size_bytes), job:jobs (id, job_title, reference_id), creator:profiles!receipts_created_by_fkey (id, full_name, email)";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    const { query } = tenantListQuery(supabase, "receipts", {
        select: RECEIPT_SELECT,
        tenantId,
        request,
        searchColumns: ["vendor_name", "notes"],
        archivable: true,
    });

    let q = query;
    if (jobId) q = q.eq("job_id", jobId);

    const { data, error, count } = await q;
    if (error) return serverError(error);
    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = receiptSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    // Confirm the referenced job + file both belong to the caller's tenant.
    // RLS would block any orthogonal-tenant insert anyway via the .eq filters
    // on the FKs, but failing fast here gives a useful error message.
    const [jobCheck, fileCheck] = await Promise.all([
        supabase.from("jobs").select("id").eq("id", validation.data.job_id).eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("files").select("id").eq("id", validation.data.file_id).eq("tenant_id", tenantId).maybeSingle(),
    ]);
    if (jobCheck.error || !jobCheck.data) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (fileCheck.error || !fileCheck.data) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { data, error } = await supabase
        .from("receipts")
        .insert({
            ...validation.data,
            tenant_id: tenantId,
            created_by: user.id,
        })
        .select(RECEIPT_SELECT)
        .single();

    if (error) {
        console.error("receipt insert error", error);
        return serverError();
    }

    return NextResponse.json({ item: data }, { status: 201 });
});
