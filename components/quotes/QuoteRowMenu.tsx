"use client";

import { useState, type MouseEvent } from "react";
import {
    MoreVertical,
    FileText,
    ShoppingCart,
    Eye,
    Pencil,
    Copy,
    Archive,
    ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export interface QuoteRowMenuProps {
    archived: boolean;
    canCreateInvoice: boolean;
    canCreatePo: boolean;
    canViewPdf: boolean;
    canEdit: boolean;
    onCreateInvoice: () => void;
    onCreatePo: () => void;
    onViewPdf: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onToggleArchive: () => void;
    /** "row" = small ghost trigger used inside table rows. "sheet" = bordered icon button for side-sheet headers. */
    variant?: "row" | "sheet";
}

const itemClass =
    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary transition-colors";

export function QuoteRowMenu({
    archived,
    canCreateInvoice,
    canCreatePo,
    canViewPdf,
    canEdit,
    onCreateInvoice,
    onCreatePo,
    onViewPdf,
    onEdit,
    onDuplicate,
    onToggleArchive,
    variant = "row",
}: QuoteRowMenuProps) {
    const [open, setOpen] = useState(false);

    const stop = (e: MouseEvent) => e.stopPropagation();
    const run = (fn: () => void) => () => {
        setOpen(false);
        fn();
    };

    const trigger =
        variant === "sheet" ? (
            <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-9 w-9 px-0"
                aria-label="More actions"
                onClick={stop}
            >
                <MoreVertical className="w-4 h-4" />
            </Button>
        ) : (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="More actions"
                onClick={stop}
            >
                <MoreVertical className="w-4 h-4" />
            </Button>
        );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1" onClick={stop}>
                {canCreateInvoice && (
                    <button type="button" onClick={run(onCreateInvoice)} className={`${itemClass} text-foreground`}>
                        <FileText className="w-4 h-4" />
                        Create Invoice
                    </button>
                )}
                {canCreatePo && (
                    <button type="button" onClick={run(onCreatePo)} className={`${itemClass} text-foreground`}>
                        <ShoppingCart className="w-4 h-4" />
                        Create PO
                    </button>
                )}
                {canViewPdf && (
                    <button type="button" onClick={run(onViewPdf)} className={`${itemClass} text-foreground`}>
                        <Eye className="w-4 h-4" />
                        View PDF
                    </button>
                )}
                {canEdit && (
                    <button type="button" onClick={run(onEdit)} className={`${itemClass} text-foreground`}>
                        <Pencil className="w-4 h-4" />
                        Edit
                    </button>
                )}
                <button type="button" onClick={run(onDuplicate)} className={`${itemClass} text-foreground`}>
                    <Copy className="w-4 h-4" />
                    Duplicate
                </button>
                <button
                    type="button"
                    onClick={run(onToggleArchive)}
                    className={`${itemClass} ${archived ? "text-foreground" : "text-rose-600"}`}
                >
                    {archived ? (
                        <>
                            <ArchiveRestore className="w-4 h-4" />
                            Restore
                        </>
                    ) : (
                        <>
                            <Archive className="w-4 h-4" />
                            Archive
                        </>
                    )}
                </button>
            </PopoverContent>
        </Popover>
    );
}
