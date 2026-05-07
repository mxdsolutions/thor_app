import { createClient } from "@/lib/supabase/client";
import type { PhotoItem } from "@/lib/report-templates/types";

const BUCKET = "report-photos";

function generatePath(tenantId: string, reportId: string, sectionId: string, fieldId: string, filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const id = crypto.randomUUID();
    return `${tenantId}/${reportId}/${sectionId}/${fieldId}/${id}.${ext}`;
}

export async function uploadReportPhoto(
    file: File,
    tenantId: string,
    reportId: string,
    sectionId: string,
    fieldId: string
): Promise<PhotoItem> {
    const supabase = createClient();
    const path = generatePath(tenantId, reportId, sectionId, fieldId, file.name);

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

    return {
        url: urlData.publicUrl,
        filename: file.name,
    };
}

/** Upload a photo on the external-completion page. The page has no Supabase
 *  session, so the upload routes through a public server endpoint that uses
 *  the service role after validating the share token. */
export async function uploadReportPhotoViaToken(
    file: File,
    token: string,
    sectionId: string,
    fieldId: string,
): Promise<PhotoItem> {
    const form = new FormData();
    form.append("file", file);
    form.append("section_id", sectionId);
    form.append("field_id", fieldId);

    const res = await fetch(`/api/public/reports/${encodeURIComponent(token)}/photos`, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        let msg = "Upload failed";
        try {
            const body = await res.json();
            if (body?.error) msg = body.error;
        } catch { /* ignore */ }
        throw new Error(msg);
    }

    return (await res.json()) as PhotoItem;
}

export async function deleteReportPhoto(url: string): Promise<void> {
    const supabase = createClient();

    const bucketUrl = supabase.storage.from(BUCKET).getPublicUrl("").data.publicUrl;
    const path = url.replace(bucketUrl, "").replace(/^\//, "");

    if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
    }
}
