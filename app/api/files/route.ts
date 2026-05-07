import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withAuth } from "@/app/api/_lib/handler";
import { tenantListQuery } from "@/app/api/_lib/list-query";
import { serverError } from "@/app/api/_lib/errors";
import { FILE_MAX_SIZE_BYTES } from "@/lib/validation";

const BUCKET = "tenant-files";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const scope = searchParams.get("scope");

    const { query } = tenantListQuery(supabase, "files", {
        select: "*, uploader:profiles!files_uploaded_by_fkey (id, full_name, email), job:jobs (id, job_title, reference_id)",
        tenantId,
        request,
        searchColumns: ["name", "mime_type"],
        archivable: true,
    });

    let q = query;
    if (jobId) {
        q = q.eq("job_id", jobId);
    } else if (scope === "tenant") {
        q = q.is("job_id", null);
    }

    const { data, error, count } = await q;
    if (error) return serverError(error);
    return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json(
            { error: "Expected multipart/form-data" },
            { status: 400 }
        );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json(
            { error: "Validation failed", details: { file: ["File is required"] } },
            { status: 400 }
        );
    }

    if (file.size === 0) {
        return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > FILE_MAX_SIZE_BYTES) {
        return NextResponse.json(
            { error: `File exceeds the ${Math.round(FILE_MAX_SIZE_BYTES / 1024 / 1024)}MB limit` },
            { status: 413 }
        );
    }

    const rawJobId = form.get("job_id");
    const jobId =
        typeof rawJobId === "string" && rawJobId.length > 0 && rawJobId !== "null"
            ? rawJobId
            : null;

    // If a job_id is supplied, confirm it belongs to the caller's tenant before
    // letting the upload land — RLS would block it on the row insert anyway,
    // but failing here means we don't waste a storage write.
    if (jobId) {
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", jobId)
            .eq("tenant_id", tenantId)
            .maybeSingle();
        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
    }

    const fileId = randomUUID();
    // Preserve the original extension so signed URLs render with the right
    // content-type hint and downloaded files keep their familiar suffix.
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const storagePath = `${tenantId}/${fileId}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
        });

    if (uploadError) {
        console.error("file upload error", uploadError);
        return serverError();
    }

    const { data, error } = await supabase
        .from("files")
        .insert({
            id: fileId,
            tenant_id: tenantId,
            job_id: jobId,
            name: file.name,
            storage_path: storagePath,
            mime_type: file.type || null,
            size_bytes: file.size,
            uploaded_by: user.id,
        })
        .select("*, uploader:profiles!files_uploaded_by_fkey (id, full_name, email), job:jobs (id, job_title, reference_id)")
        .single();

    if (error) {
        // Roll back the storage object so we don't orphan blobs when the row
        // insert fails (e.g. transient DB error).
        await supabase.storage.from(BUCKET).remove([storagePath]);
        console.error("file insert error", error);
        return serverError();
    }

    return NextResponse.json({ item: data }, { status: 201 });
});
