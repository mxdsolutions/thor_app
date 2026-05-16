"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { ReportTemplate } from "@/lib/report-templates/types";

type ReportTemplateRowMenuProps = {
    template: ReportTemplate;
    onEdit: () => void;
    onAssign: () => void;
};

const itemClass =
    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary transition-colors";

export function ReportTemplateRowMenu({
    template,
    onEdit,
    onAssign,
}: ReportTemplateRowMenuProps) {
    const [open, setOpen] = useState(false);

    const showAssign = template.tenant_id == null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Row actions"
                >
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-52 p-1"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={() => { setOpen(false); onEdit(); }}
                    className={`${itemClass} text-foreground`}
                >
                    <Pencil className="w-4 h-4" />
                    Edit
                </button>
                {showAssign && (
                    <button
                        type="button"
                        onClick={() => { setOpen(false); onAssign(); }}
                        className={`${itemClass} text-foreground`}
                    >
                        <Building2 className="w-4 h-4" />
                        Assign to Tenant
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
}
