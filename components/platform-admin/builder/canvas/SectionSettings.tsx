"use client";

import { useState } from "react";
import {
    Trash2 as TrashIcon,
    Settings as SettingsIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { SectionDef } from "@/lib/report-templates/types";
import { useSectionActions } from "./context";

interface SectionSettingsProps {
    section: SectionDef;
    sectionIndex: number;
    totalSections: number;
}

/**
 * Gear-icon popover for the section header. Toggles repeater mode, sets
 * min/max items, and exposes the delete button (suppressed when the section
 * is the only one left so the user can't be stuck with an empty template).
 */
export function SectionSettings({ section, sectionIndex, totalSections }: SectionSettingsProps) {
    const sectionActions = useSectionActions(sectionIndex);
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary shrink-0"
                    aria-label="Section settings"
                >
                    <SettingsIcon className="w-3.5 h-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-[280px] p-3 space-y-3">
                <div className="rounded-xl border border-border/60 px-3 py-2.5">
                    <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                            checked={section.type === "repeater"}
                            onCheckedChange={(c) =>
                                sectionActions.update({
                                    type: c ? "repeater" : "standard",
                                })
                            }
                            className="mt-0.5"
                        />
                        <div className="flex-1 -mt-0.5">
                            <span className="text-xs font-medium">Allow multiple entries</span>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                                Users can add this section&apos;s questions multiple times — e.g. one entry per defect.
                            </p>
                        </div>
                    </label>
                </div>
                {section.type === "repeater" && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium">Min</label>
                            <Input
                                type="number"
                                value={section.minItems ?? ""}
                                onChange={(e) =>
                                    sectionActions.update({
                                        minItems: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                }
                                placeholder="Any"
                                className="rounded-lg h-8 text-sm mt-1"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium">Max</label>
                            <Input
                                type="number"
                                value={section.maxItems ?? ""}
                                onChange={(e) =>
                                    sectionActions.update({
                                        maxItems: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                }
                                placeholder="Any"
                                className="rounded-lg h-8 text-sm mt-1"
                                min={1}
                            />
                        </div>
                    </div>
                )}
                {totalSections > 1 && (
                    <button
                        onClick={() => {
                            setOpen(false);
                            sectionActions.delete();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs text-red-500 hover:bg-red-500/5"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete section
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
}
