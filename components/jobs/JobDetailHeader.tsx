"use client";

import { cn } from "@/lib/utils";
import { avatarSurfaceClass } from "@/lib/design-system";
import { Plus as PlusIcon, ArrowLeft as ArrowLeftIcon, X as XMarkIcon, ChevronDown, MoreVertical, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { JobDetailJob } from "./JobDetailView";

type StatusConfig = Record<string, { label: string; color: string }>;

interface CreateOption {
    id: string;
    label: string;
    onClick: () => void;
}

interface JobDetailHeaderProps {
    data: JobDetailJob;
    statusConfig: StatusConfig;
    mode: "inline" | "sheet";
    onClose?: () => void;
    onArchive: (archived: boolean) => void;
    createOptions: CreateOption[];
    moreMenuOpen: boolean;
    setMoreMenuOpen: (open: boolean) => void;
    createMenuOpen: boolean;
    setCreateMenuOpen: (open: boolean) => void;
}

export function JobDetailHeader({
    data,
    statusConfig,
    mode,
    onClose,
    onArchive,
    createOptions,
    moreMenuOpen,
    setMoreMenuOpen,
    createMenuOpen,
    setCreateMenuOpen,
}: JobDetailHeaderProps) {
    const status = statusConfig[data.status] || statusConfig.new;

    return (
        <>
            {mode === "inline" && onClose && (
                <div className="px-6 pt-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back to All Jobs
                    </button>
                </div>
            )}

            <div className={cn("px-6 pb-4 border-b border-border shrink-0", mode === "inline" ? "pt-3" : "pt-6")}>
                <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 md:w-[60px] md:h-[60px] rounded-xl flex items-center justify-center shrink-0", avatarSurfaceClass)}>
                        <span className="text-sm md:text-lg font-bold uppercase tracking-wide">{(data.job_title || "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <h1 className="font-statement text-xl md:text-3xl font-extrabold tracking-tight leading-tight truncate">{data.job_title}</h1>
                            <span className="inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider bg-secondary text-foreground">
                                <span className={cn("w-2 h-2 rounded-full mr-2", status.color)} />
                                {status.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            {data.reference_id && (
                                <>
                                    <span className="font-mono">{data.reference_id}</span>
                                    <span>·</span>
                                </>
                            )}
                            <span>${data.amount.toLocaleString()}</span>
                            {data.scheduled_date && (
                                <>
                                    <span>·</span>
                                    <span>{new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                                </>
                            )}
                            {(data.assignees || []).length > 0 && (
                                <>
                                    <span>·</span>
                                    <div className="flex -space-x-1.5 items-center">
                                        {(data.assignees || []).map((a, idx) => {
                                            const name = a.full_name || a.email || "Unknown";
                                            const initials = (a.full_name || a.email || "?").split(/[\s@]/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
                                            return (
                                                <div
                                                    key={a.id ?? idx}
                                                    title={name}
                                                    className="w-6 h-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-bold text-foreground"
                                                >
                                                    {initials}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <Popover open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                        <PopoverTrigger asChild>
                            <Button size="sm" className="shrink-0 hidden md:inline-flex">
                                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                                Create
                                <ChevronDown className="w-3.5 h-3.5 ml-1 -mr-1" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 p-1">
                            {createOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setCreateMenuOpen(false);
                                        opt.onClick();
                                    }}
                                    className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-secondary text-foreground"
                                >
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>
                    <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                        <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" className="shrink-0 h-9 w-9 px-0" aria-label="More actions">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setMoreMenuOpen(false);
                                    onArchive(!data.archived_at);
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary text-foreground transition-colors"
                            >
                                {data.archived_at ? (
                                    <>
                                        <ArchiveRestore className="w-4 h-4" />
                                        Restore job
                                    </>
                                ) : (
                                    <>
                                        <Archive className="w-4 h-4" />
                                        Archive job
                                    </>
                                )}
                            </button>
                        </PopoverContent>
                    </Popover>
                    {mode === "sheet" && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center shrink-0 transition-colors"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {data.archived_at && (
                <div className="px-6 py-2.5 bg-muted border-b border-border flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Archive className="w-4 h-4" />
                        <span>This job is archived.</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-3" onClick={() => onArchive(false)}>
                        Restore
                    </Button>
                </div>
            )}
        </>
    );
}
