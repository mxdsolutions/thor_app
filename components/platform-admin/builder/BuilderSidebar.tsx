"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
    Plus as PlusIcon,
    GripVertical as GripIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionDef } from "@/lib/report-templates/types";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import { PRESET_FIELD_GROUPS } from "@/lib/report-templates/presets";
import type { PresetFieldGroup } from "@/lib/report-templates/presets";
import { CoverUploader } from "./CoverUploader";
import type { BuilderTemplateMeta } from "./BuilderShell";

interface BuilderSidebarProps {
    templateId: string;
    meta: BuilderTemplateMeta;
    sections: SectionDef[];
    currentSectionIndex: number;
    onUpdateMeta: (updates: Partial<BuilderTemplateMeta>) => void;
    onNavigate: (index: number) => void;
    onAddSection: (preset: PresetFieldGroup | null) => void;
    onReorderSections: (newSections: SectionDef[]) => void;
}

/**
 * Left rail. Houses template-level metadata (name, category, description) at
 * the top and the vertical section nav (drag-to-reorder) below. Visible only
 * in edit mode — preview / PDF hide it so the canvas matches /r exactly.
 */
export function BuilderSidebar({
    templateId,
    meta,
    sections,
    currentSectionIndex,
    onUpdateMeta,
    onNavigate,
    onAddSection,
    onReorderSections,
}: BuilderSidebarProps) {
    return (
        <aside className="w-72 shrink-0 border-r border-border bg-background overflow-y-auto hidden md:flex flex-col">
            <div className="p-5 space-y-5">
                <SidebarSection label="Template name">
                    <Input
                        value={meta.name}
                        onChange={(e) => onUpdateMeta({ name: e.target.value })}
                        placeholder="Untitled template"
                        className="h-9 text-sm"
                    />
                </SidebarSection>

                <SidebarSection label="Category">
                    <Select
                        value={meta.category || undefined}
                        onValueChange={(value) => onUpdateMeta({ category: value })}
                    >
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select category…" />
                        </SelectTrigger>
                        <SelectContent>
                            {TEMPLATE_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SidebarSection>

                <SidebarSection label="Description">
                    <Textarea
                        value={meta.description}
                        onChange={(e) => onUpdateMeta({ description: e.target.value })}
                        placeholder="What is this template for?"
                        rows={4}
                        className="rounded-xl text-sm resize-y"
                    />
                </SidebarSection>

                <SidebarSection label="Report cover">
                    <CoverUploader
                        templateId={templateId}
                        tenantId={meta.tenant_id}
                        coverUrl={meta.report_cover_url}
                        onChange={(url) => onUpdateMeta({ report_cover_url: url })}
                    />
                </SidebarSection>
            </div>

            <div className="h-px bg-border mx-5" />

            <div className="p-5 space-y-2">
                <SectionsHeader onAddSection={onAddSection} />
                <Reorder.Group
                    axis="y"
                    values={sections}
                    onReorder={onReorderSections}
                    className="flex flex-col gap-1"
                >
                    {sections.map((section, index) => (
                        <SectionListItem
                            key={section.id}
                            section={section}
                            index={index}
                            isActive={index === currentSectionIndex}
                            onNavigate={onNavigate}
                        />
                    ))}
                </Reorder.Group>
            </div>
        </aside>
    );
}

interface SidebarSectionProps {
    label: string;
    children: React.ReactNode;
}

function SidebarSection({ label, children }: SidebarSectionProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {label}
            </label>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Sections nav header — label + add popover                          */
/* ------------------------------------------------------------------ */

interface SectionsHeaderProps {
    onAddSection: (preset: PresetFieldGroup | null) => void;
}

function SectionsHeader({ onAddSection }: SectionsHeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Sections
            </label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label="Add section"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    side="right"
                    align="start"
                    className="w-[320px] p-2 max-h-[70vh] overflow-y-auto"
                >
                    <button
                        onClick={() => {
                            onAddSection(null);
                            setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 text-left transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <PlusIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">Blank section</p>
                            <p className="text-[11px] text-muted-foreground">Start from scratch</p>
                        </div>
                    </button>
                    <div className="h-px bg-border my-1.5" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-1.5">
                        Or start from a preset
                    </p>
                    {PRESET_FIELD_GROUPS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => {
                                onAddSection(preset);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 text-left transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                <preset.icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{preset.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {preset.description}
                                </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                {preset.fields.length}
                            </span>
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section list item — draggable via grip handle, clickable elsewhere */
/* ------------------------------------------------------------------ */

interface SectionListItemProps {
    section: SectionDef;
    index: number;
    isActive: boolean;
    onNavigate: (index: number) => void;
}

function SectionListItem({ section, index, isActive, onNavigate }: SectionListItemProps) {
    // Manual drag controls — only the grip handle starts a drag, so the rest
    // of the row stays clickable for navigation.
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={section}
            dragListener={false}
            dragControls={controls}
            as="div"
            // Stop the row from interfering with the page's overall scroll on
            // touch devices when the user actually wants to drag.
            style={{ touchAction: "none" }}
        >
            <div
                onClick={() => onNavigate(index)}
                className={cn(
                    "group/section w-full flex items-center gap-2 pl-1.5 pr-2 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer select-none",
                    isActive
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
            >
                <button
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        controls.start(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-4 h-5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-100 transition-opacity touch-none"
                    aria-label="Drag to reorder"
                >
                    <GripIcon className="w-3.5 h-3.5" />
                </button>
                <span
                    className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                        isActive
                            ? "bg-foreground text-background"
                            : "bg-secondary text-muted-foreground",
                    )}
                >
                    {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-0 truncate">
                    {section.title || "Untitled section"}
                </span>
            </div>
        </Reorder.Item>
    );
}
