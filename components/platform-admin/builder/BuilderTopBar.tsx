"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
    ArrowLeft as ArrowLeftIcon,
    FileText as FileTextIcon,
    Loader2 as LoaderIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasMode } from "./types";

interface BuilderTopBarProps {
    saving: boolean;
    hasChanges: boolean;
    onSave: () => void;
    canvasMode: CanvasMode;
    onCanvasModeChange: (mode: CanvasMode) => void;
    onPreviewPdf: () => void;
    previewingPdf: boolean;
    /** Where the "Templates" back link points. Set per host (platform-admin
     *  list vs dashboard list) so the builder is reusable. */
    backHref: string;
    /** Label for the back link. Defaults to "Templates". */
    backLabel?: string;
}

const MODE_OPTIONS = [
    { value: "edit" as const, label: "Edit" },
    // "Form" rather than "Preview" because what you see is the wizard the
    // tradie will fill out — distinguishes it from the PDF preview button.
    { value: "preview" as const, label: "Form" },
];

export function BuilderTopBar({
    saving,
    hasChanges,
    onSave,
    canvasMode,
    onCanvasModeChange,
    onPreviewPdf,
    previewingPdf,
    backHref,
    backLabel = "Templates",
}: BuilderTopBarProps) {
    // Top bar sits on the dark frame (`bg-foreground`) painted by the parent
    // BuilderShell. No background of its own and no bottom border — the seam
    // to the rounded light content area below is the visual divider.
    // Text/buttons inverted to white-on-slate, mirroring DashboardShell.
    return (
        <div className="h-14 flex items-center gap-3 px-4 shrink-0">
            {/* Left */}
            <div className="flex items-center gap-3 shrink-0">
                <Link
                    href={backHref}
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    {backLabel}
                </Link>
            </div>

            {/* Centre — own flex slot so it stays centred without overlapping
                the left/right clusters at narrow widths. */}
            <div className="flex-1 flex justify-center min-w-0">
                <SegmentedControl<CanvasMode>
                    value={canvasMode}
                    onChange={onCanvasModeChange}
                    options={MODE_OPTIONS}
                />
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 shrink-0">
                <button
                    type="button"
                    onClick={onPreviewPdf}
                    disabled={previewingPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-3 h-8 text-xs font-medium text-white disabled:opacity-60"
                >
                    {previewingPdf ? (
                        <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <FileTextIcon className="w-3.5 h-3.5" />
                    )}
                    {previewingPdf ? "Generating…" : "Preview as PDF"}
                </button>
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <div
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            saving ? "bg-amber-400" : hasChanges ? "bg-amber-400" : "bg-emerald-400"
                        )}
                    />
                    {saving ? "Saving..." : hasChanges ? "Unsaved" : "Saved"}
                </div>
                <Button
                    onClick={onSave}
                    disabled={saving || !hasChanges}
                    // Inverse of the default solid button so it reads as
                    // primary against the dark frame: white surface, dark
                    // text. Falls back to the muted look when disabled.
                    className="px-5 h-8 text-xs bg-white text-foreground hover:bg-white/90 disabled:bg-white/20 disabled:text-white/50"
                >
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    );
}
