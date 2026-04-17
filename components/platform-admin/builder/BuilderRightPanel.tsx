"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import { PRESET_FIELD_GROUPS } from "@/lib/report-templates/presets";
import type { PresetFieldGroup } from "@/lib/report-templates/presets";

interface BuilderRightPanelProps {
    name: string;
    category: string;
    description: string;
    onUpdateMeta: (updates: { name?: string; category?: string; description?: string }) => void;
    hasSectionSelected: boolean;
    onAddPreset: (preset: PresetFieldGroup) => void;
}

export function BuilderRightPanel({
    name,
    category,
    description,
    onUpdateMeta,
    hasSectionSelected,
    onAddPreset,
}: BuilderRightPanelProps) {
    return (
        <div className="w-[300px] border-l border-border bg-background flex flex-col overflow-hidden shrink-0">
            {/* Template settings */}
            <div className="p-4 border-b border-border space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Template Settings
                </h3>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Name</label>
                    <Input
                        value={name}
                        onChange={(e) => onUpdateMeta({ name: e.target.value })}
                        className="rounded-xl mt-1 h-8 text-sm"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Category</label>
                    <select
                        value={category}
                        onChange={(e) => onUpdateMeta({ category: e.target.value })}
                        className="flex h-8 w-full rounded-xl border border-input bg-background px-3 text-base mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="">Select...</option>
                        {TEMPLATE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => onUpdateMeta({ description: e.target.value })}
                        placeholder="Optional..."
                        rows={2}
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                </div>
            </div>

            {/* Preset field groups */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Quick Add Fields
                </h3>
                {!hasSectionSelected && (
                    <p className="text-[11px] text-muted-foreground/60 mb-2">Select a section first to add preset fields.</p>
                )}
                {PRESET_FIELD_GROUPS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onAddPreset(preset)}
                        disabled={!hasSectionSelected}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                            hasSectionSelected
                                ? "border-border hover:border-foreground/20 hover:bg-secondary/60 active:scale-[0.98] cursor-pointer"
                                : "border-border/50 opacity-40 cursor-not-allowed"
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <preset.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{preset.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">
                            {preset.fields.length}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
