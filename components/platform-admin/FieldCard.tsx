"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconPencil as PencilIcon, IconTrash as TrashIcon, IconChevronUp as ChevronUpIcon, IconChevronDown as ChevronDownIcon } from "@tabler/icons-react";
import type { FieldDef } from "@/lib/report-templates/types";
import { FIELD_TYPE_LABELS } from "@/lib/report-templates/types";

interface FieldCardProps {
    field: FieldDef;
    index: number;
    total: number;
    onEdit: () => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

export function FieldCard({ field, index, total, onEdit, onDelete, onMoveUp, onMoveDown }: FieldCardProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 group hover:border-foreground/20 transition-colors">
            <div className="flex flex-col gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={onMoveUp}
                    disabled={index === 0}
                >
                    <ChevronUpIcon className="w-3 h-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                >
                    <ChevronDownIcon className="w-3 h-3" />
                </Button>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                        {FIELD_TYPE_LABELS[field.type]}
                    </span>
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium",
                        field.width === "half" && "bg-blue-500/10 text-blue-600"
                    )}>
                        {field.width === "half" ? "Half" : "Full"} width
                    </span>
                    {field.options && field.options.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                            {field.options.length} options
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" aria-label="Edit field" className="h-7 w-7" onClick={onEdit}>
                    <PencilIcon className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete field" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={onDelete}>
                    <TrashIcon className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
