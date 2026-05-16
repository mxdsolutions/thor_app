"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "tenant-assets";

/**
 * Build the storage path for a template's PDF cover.
 *
 * `tenant-assets/{tenantId}/report-templates/{templateId}/cover.pdf`
 *
 * Lives under the tenant's prefix so it shares ACL / lifecycle with the
 * tenant-level `report-cover.pdf` and can be migrated/cleaned together.
 */
function buildCoverPath(tenantId: string, templateId: string): string {
    return `${tenantId}/report-templates/${templateId}/cover.pdf`;
}

/**
 * Upload a PDF cover for a report template. Returns a cache-busted public URL
 * that callers should persist on `report_templates.report_cover_url`.
 */
export async function uploadTemplateCover(
    file: File,
    tenantId: string,
    templateId: string,
): Promise<string> {
    if (file.type !== "application/pdf") {
        throw new Error("Cover must be a PDF");
    }
    if (file.size > 10 * 1024 * 1024) {
        throw new Error("Cover exceeds the 10MB limit");
    }

    const supabase = createClient();
    const path = buildCoverPath(tenantId, templateId);

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: "application/pdf",
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Remove a template's cover from storage. Safe to call even if the file
 * doesn't exist — Supabase reports success either way.
 */
export async function deleteTemplateCover(tenantId: string, templateId: string): Promise<void> {
    const supabase = createClient();
    const path = buildCoverPath(tenantId, templateId);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
}
