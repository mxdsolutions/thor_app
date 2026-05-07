import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { notFoundError, serverError, validationError } from "@/app/api/_lib/errors";
import { receiptUpdateSchema } from "@/lib/validation";

const RECEIPT_SELECT =
    "*, file:files (id, name, storage_path, mime_type, size_bytes), job:jobs (id, job_title, reference_id), creator:profiles!receipts_created_by_fkey (id, full_name, email)";

const FILES_BUCKET = "tenant-files";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("Receipt");

    const { data, error } = await supabase
        .from("receipts")
        .select(RECEIPT_SELECT)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return notFoundError("Receipt");

    // Inline the photo's signed URL so the side sheet can preview the image
    // without a second round-trip through /api/files/[file_id].
    let photo_url: string | null = null;
    if (data.file?.storage_path) {
        const { data: signed } = await supabase.storage
            .from(FILES_BUCKET)
            .createSignedUrl(data.file.storage_path, SIGNED_URL_TTL_SECONDS);
        photo_url = signed?.signedUrl ?? null;
    }

    return NextResponse.json({ item: { ...data, photo_url } });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const id = request.nextUrl.pathname.split("/").at(-1);
    if (!id) return notFoundError("Receipt");

    const body = await request.json().catch(() => ({}));
    const validation = receiptUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("receipts")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select(RECEIPT_SELECT)
        .single();

    if (error) {
        console.error("receipt update error", error);
        return serverError();
    }
    if (!data) return notFoundError("Receipt");

    return NextResponse.json({ item: data });
});
