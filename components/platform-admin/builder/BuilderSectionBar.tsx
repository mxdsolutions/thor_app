"use client";

import { cn } from "@/lib/utils";
import { Plus as PlusIcon, Trash2 as TrashIcon } from "lucide-react";
import type { SectionDef } from "@/lib/report-templates/types";

interface BuilderSectionBarProps {
    sections: SectionDef[];
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    onAdd: () => void;
    onDelete: (index: number) => void;
    onMove: (index: number, direction: "left" | "right") => void;
}

export function BuilderSectionBar({
    sections,
    selectedIndex,
    onSelect,
    onAdd,
    onDelete,
}: BuilderSectionBarProps) {
    return (
        <div className="h-16 border-t border-border bg-background shrink-0 flex items-center justify-center px-3 gap-1.5 overflow-x-auto">
            {sections.map((section, index) => (
                <div
                    key={section.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(index)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(index); }}
                    className={cn(
                        "group relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer",
                        selectedIndex === index
                            ? "bg-foreground text-background shadow-sm"
                            : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                >
                    <span
                        className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
                            selectedIndex === index
                                ? "bg-background/20 text-background"
                                : "bg-foreground/10 text-muted-foreground"
                        )}
                    >
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate max-w-[120px]">{section.title}</span>
                    {selectedIndex === index && sections.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(index);
                            }}
                            className="ml-1 p-0.5 rounded hover:bg-background/20 text-background/60 hover:text-background transition-colors"
                        >
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ))}

            <button
                onClick={onAdd}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
            >
                <PlusIcon className="w-4 h-4" />
            </button>
        </div>
    );
}
