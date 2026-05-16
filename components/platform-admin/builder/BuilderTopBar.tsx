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
    return (
        <div className="h-14 border-b border-border bg-background flex items-center gap-3 px-4 shrink-0">
            {/* Left */}
            <div className="flex items-center gap-3 shrink-0">
                <Link
                    href="/platform-admin/report-templates"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Templates
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-secondary/60 transition-colors px-3 h-8 text-xs font-medium disabled:opacity-60"
                >
                    {previewingPdf ? (
                        <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <FileTextIcon className="w-3.5 h-3.5" />
                    )}
                    {previewingPdf ? "Generating…" : "Preview as PDF"}
                </button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                    className="px-5 h-8 text-xs"
                >
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    );
}
