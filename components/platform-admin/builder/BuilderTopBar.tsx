"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconArrowLeft as ArrowLeftIcon, IconEye as EyeIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface BuilderTopBarProps {
    templateId: string;
    templateName: string;
    saving: boolean;
    hasChanges: boolean;
    onSave: () => void;
}

export function BuilderTopBar({ templateId, templateName, saving, hasChanges, onSave }: BuilderTopBarProps) {
    return (
        <div className="h-14 border-b border-border bg-background flex items-center px-4 shrink-0">
            {/* Left */}
            <div className="flex items-center gap-4 min-w-0 w-[280px] shrink-0">
                <Link
                    href="/platform-admin/report-templates"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Templates
                </Link>
            </div>

            {/* Centre */}
            <div className="flex-1 flex items-center justify-center min-w-0">
                <h1 className="text-lg font-semibold truncate">{templateName}</h1>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 w-[300px] justify-end shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            saving ? "bg-amber-400" : hasChanges ? "bg-amber-400" : "bg-emerald-400"
                        )}
                    />
                    {saving ? "Saving..." : hasChanges ? "Unsaved changes" : "Saved"}
                </div>
                <Link
                    href={`/platform-admin/report-templates/${templateId}/preview`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 h-8 text-xs font-medium border border-border hover:bg-secondary transition-colors"
                >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Preview
                </Link>
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
