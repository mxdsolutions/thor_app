"use client";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
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
}: BuilderTopBarProps) {
    // Top bar sits on the dark frame (`bg-foreground`) painted by the parent
    // BuilderShell. No background of its own and no bottom border — the seam
    // to the rounded light content area below is the visual divider.
    // Text/buttons inverted to white-on-slate, mirroring DashboardShell.
    return (
        <div className="relative h-14 flex items-center justify-between gap-3 px-4 shrink-0">
            {/* Left — static label, not a link. The builder opens in a new
                tab from two entry points (platform-admin list and dashboard
                settings), so a "back" link would point to different places
                for different users; closing the tab is the natural exit. */}
            <div className="flex items-center shrink-0 text-sm font-medium text-zinc-300">
                Report Template Builder
            </div>

            {/* Centre — absolutely positioned so it tracks the bar's geometric
                midpoint, independent of left/right cluster widths. Using a
                flex slot would centre within the leftover space (biased left
                because the right cluster is wider). pointer-events stay on
                the inner control so the rest of the bar remains clickable. */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
                <div className="pointer-events-auto">
                    <SegmentedControl<CanvasMode>
                        value={canvasMode}
                        onChange={onCanvasModeChange}
                        options={MODE_OPTIONS}
                    />
                </div>
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
