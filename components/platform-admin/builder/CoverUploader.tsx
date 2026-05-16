"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
    FileText as FileTextIcon,
    Upload as UploadIcon,
    Trash2 as TrashIcon,
    Loader2 as LoaderIcon,
} from "lucide-react";
import { uploadTemplateCover, deleteTemplateCover } from "@/lib/report-templates/cover-upload";

interface CoverUploaderProps {
    templateId: string;
    tenantId: string | null;
    coverUrl: string | null;
    onChange: (url: string | null) => void;
}

/**
 * PDF cover override for a single report template. Three visual states:
 *  - **No tenant** — informational placeholder; upload is blocked until a
 *    tenant is assigned so the storage path can include the tenant prefix.
 *    Becomes dead code once the builder moves to `/dashboard/builder` where
 *    tenant is always implicit (see audit U2 cleanup).
 *  - **Cover present** — link + Replace / Remove buttons.
 *  - **No cover yet** — single dashed Upload button.
 *
 * Lives next to BuilderSidebar but in its own file so the create modal can
 * also embed it once the cover-during-creation flow is wired up.
 */
export function CoverUploader({ templateId, tenantId, coverUrl, onChange }: CoverUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!tenantId) {
            toast.error("Assign a tenant before uploading a cover");
            return;
        }
        setUploading(true);
        try {
            const url = await uploadTemplateCover(file, tenantId, templateId);
            onChange(url);
            toast.success("Cover uploaded");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        if (!tenantId) {
            onChange(null);
            return;
        }
        try {
            await deleteTemplateCover(tenantId, templateId);
        } catch {
            // Ignore — UI is the source of truth here. We still clear the URL.
        }
        onChange(null);
        toast.success("Cover removed");
    };

    if (!tenantId) {
        return (
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Assign a tenant first — the cover is stored under that tenant.
            </p>
        );
    }

    if (coverUrl) {
        return (
            <div className="rounded-xl border border-border/60 bg-background p-2.5 space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                    <FileTextIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a
                        href={coverUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 text-xs truncate hover:underline"
                    >
                        Custom cover PDF
                    </a>
                </div>
                <div className="flex items-center gap-1.5">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFile(file);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border/60 px-2 py-1.5 text-[11px] font-medium hover:bg-secondary/60 transition-colors disabled:opacity-60"
                    >
                        {uploading ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <UploadIcon className="w-3 h-3" />}
                        Replace
                    </button>
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={uploading}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/60 px-2 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-60"
                    >
                        <TrashIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                }}
            />
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-60"
            >
                {uploading ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <UploadIcon className="w-3.5 h-3.5" />}
                {uploading ? "Uploading…" : "Upload cover PDF"}
            </button>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Falls back to the tenant&apos;s default cover when empty.
            </p>
        </div>
    );
}
