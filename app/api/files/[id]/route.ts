import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError, validationError } from "@/app/api/_lib/errors";
import { fileUpdateSchema } from "@/lib/validation";

const BUCKET = "tenant-files";
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("File");

    const { data, error } = await supabase
        .from("files")
        .select(
            "*, uploader:profiles!files_uploaded_by_fkey (id, full_name, email), job:jobs (id, job_title, reference_id)"
        )
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return notFoundError("File");

    // Mint a short-lived signed URL so the client can stream / preview the
    // blob without the bucket being public.
    const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SECONDS, {
            download: data.name,
        });

    if (signError) {
        console.error("file signed url error", signError);
        return serverError();
    }

    return NextResponse.json({ item: { ...data, download_url: signed.signedUrl } });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("File");

    const body = await request.json().catch(() => ({}));
    const validation = fileUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("files")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError(error);
    if (!data) return notFoundError("File");

    return NextResponse.json({ item: data });
});
