import { NextResponse } from "next/server";
import { resolveShareToken } from "../_resolve";
import { ipFromRequest, isOverLimit, recordMiss } from "../_rate-limit";
import type { TemplateSchema } from "@/lib/report-templates/types";

const BUCKET = "report-photos";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const EXT_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
};

// Magic-byte signatures for the allowed types. Each entry: [offset, bytes].
const MAGIC: Array<{ mime: string; offset: number; bytes: number[] }> = [
    { mime: "image/jpeg", offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
    { mime: "image/png", offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { mime: "image/webp", offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP" at offset 8
    { mime: "image/heic", offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // "ftyp" at offset 4 (heic/heif)
];

function sniffMime(buf: Uint8Array): string | null {
    for (const { mime, offset, bytes } of MAGIC) {
        if (buf.length < offset + bytes.length) continue;
        let ok = true;
        for (let i = 0; i < bytes.length; i++) {
            if (buf[offset + i] !== bytes[i]) { ok = false; break; }
        }
        if (ok) return mime;
    }
    return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const ip = ipFromRequest(request);
    if (isOverLimit(ip)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const resolved = await resolveShareToken(token);
    if (resolved.kind === "missing") {
        recordMiss(ip);
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (resolved.kind === "revoked" || resolved.kind === "expired") {
        return NextResponse.json({ error: "Link no longer accepts uploads", state: resolved.kind }, { status: 410 });
    }

    const { admin, row } = resolved;

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = form.get("file");
    const sectionId = form.get("section_id");
    const fieldId = form.get("field_id");

    if (!(file instanceof File) || typeof sectionId !== "string" || typeof fieldId !== "string") {
        return NextResponse.json({ error: "Missing file or identifiers" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Verify section_id and field_id belong to the live template — prevents
    // attackers from writing to arbitrary storage paths.
    const { data: report } = await admin
        .from("reports")
        .select("template_id, archived_at")
        .eq("id", row.report_id)
        .eq("tenant_id", row.tenant_id)
        .maybeSingle();

    if (!report || report.archived_at) {
        return NextResponse.json({ error: "Report is no longer available", state: "archived" }, { status: 410 });
    }

    if (!report.template_id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: template } = await admin
        .from("report_templates")
        .select("schema")
        .eq("id", report.template_id)
        .eq("is_active", true)
        .maybeSingle();

    const schema = (template?.schema && (template.schema as TemplateSchema).version === 1
        ? (template.schema as TemplateSchema)
        : null);

    const section = schema?.sections.find((s) => s.id === sectionId);
    const field = section?.fields.find((f) => f.id === fieldId && f.type === "photo_upload");
    if (!field) {
        return NextResponse.json({ error: "Invalid section or field" }, { status: 400 });
    }

    // Reserve a photo slot atomically — also re-checks token validity.
    const { error: counterError } = await admin.rpc("increment_share_photo_count", {
        p_token: token,
        p_max: 200,
    });

    if (counterError) {
        const msg = counterError.message || "";
        if (msg.includes("photo_limit_or_invalid_token")) {
            return NextResponse.json({ error: "Upload limit reached" }, { status: 429 });
        }
        console.error("[public-reports.photos] counter", counterError);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Magic-byte sniff after the counter so we don't waste a slot, but the
    // counter is the security gate — a malicious file with the wrong content
    // type still consumed a token slot, that's fine.
    const buf = new Uint8Array(await file.arrayBuffer());
    const sniffed = sniffMime(buf);
    if (!sniffed || sniffed !== file.type) {
        return NextResponse.json({ error: "File contents do not match declared type" }, { status: 400 });
    }

    const ext = EXT_BY_MIME[file.type] ?? "jpg";
    const id = crypto.randomUUID();
    const path = `${row.tenant_id}/${row.report_id}/${sectionId}/${fieldId}/external/${id}.${ext}`;

    const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, buf, { contentType: file.type, upsert: false });

    if (uploadError) {
        console.error("[public-reports.photos] upload", uploadError);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
        url: urlData.publicUrl,
        filename: file.name,
    }, { status: 201 });
}
