"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import { IconFileText as DocumentTextIcon, IconTools as WrenchScrewdriverIcon, IconEye as EyeIcon } from "@tabler/icons-react";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import type { ReportTemplate } from "@/lib/report-templates/types";

interface ReportTemplateSideSheetProps {
    templateId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

function countFields(schema: ReportTemplate["schema"]): number {
    if (!schema?.sections) return 0;
    return schema.sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);
}

function countSections(schema: ReportTemplate["schema"]): number {
    return schema?.sections?.length || 0;
}

export function ReportTemplateSideSheet({ templateId, open, onOpenChange, onUpdate }: ReportTemplateSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<ReportTemplate | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!templateId || !open) return;
        setActiveTab("details");
        setLoading(true);
        fetch(`/api/platform-admin/report-templates/${templateId}`)
            .then((r) => r.json())
            .then((d) => setData(d.item || null))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [templateId, open]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch(`/api/platform-admin/report-templates/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [column]: value }),
        });
        if (res.ok) {
            setData((prev) => prev ? { ...prev, [column]: value } as ReportTemplate : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const tabs = [
        { id: "details", label: "Details" },
        { id: "schema", label: "Schema" },
    ];

    const categoryLabel = data?.category
        ? TEMPLATE_CATEGORIES.find((c) => c.value === data.category)?.label || data.category
        : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    {loading ? (
                        <SheetHeader className="space-y-0 text-left">
                            <SheetTitle className="sr-only">Loading template</SheetTitle>
                            <div className="animate-pulse space-y-2">
                                <div className="h-6 w-48 bg-secondary rounded" />
                                <div className="h-4 w-32 bg-secondary rounded" />
                            </div>
                        </SheetHeader>
                    ) : data && (
                        <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                                <DocumentTextIcon className="w-6 h-6 text-violet-600" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center gap-2.5">
                                    <SheetTitle className="text-lg font-bold truncate">{data.name}</SheetTitle>
                                    <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full mr-1.5",
                                            data.is_active ? "bg-emerald-500" : "bg-gray-400"
                                        )} />
                                        {data.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <SheetDescription className="text-sm text-muted-foreground mt-1">
                                    {data.slug}
                                </SheetDescription>
                            </div>
                        </SheetHeader>
                    )}
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-40 bg-secondary rounded-xl" />
                            </div>
                        ) : data && (
                            <>
                                {activeTab === "details" && (
                                    <div className="space-y-4">
                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/platform-admin/builder/${data.id}`}
                                                target="_blank"
                                                className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                                            >
                                                <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                                Open Builder
                                            </Link>
                                            <Link
                                                href={`/platform-admin/report-templates/${data.id}/preview`}
                                                target="_blank"
                                                className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-xs font-medium border border-border hover:bg-secondary transition-colors"
                                            >
                                                <EyeIcon className="w-3.5 h-3.5" />
                                                Preview
                                            </Link>
                                        </div>

                                        {/* Info */}
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    { label: "Name", value: data.name, dbColumn: "name", type: "text", rawValue: data.name },
                                                    { label: "Slug", value: data.slug },
                                                    {
                                                        label: "Category",
                                                        value: categoryLabel,
                                                        dbColumn: "category",
                                                        type: "select",
                                                        rawValue: data.category,
                                                        options: TEMPLATE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
                                                    },
                                                    {
                                                        label: "Status",
                                                        value: data.is_active ? "Active" : "Inactive",
                                                        dbColumn: "is_active",
                                                        type: "select",
                                                        rawValue: data.is_active ? "true" : "false",
                                                        options: [
                                                            { value: "true", label: "Active" },
                                                            { value: "false", label: "Inactive" },
                                                        ],
                                                    },
                                                    {
                                                        label: "Created",
                                                        value: new Date(data.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
                                                    },
                                                    {
                                                        label: "Updated",
                                                        value: timeAgo(data.updated_at),
                                                    },
                                                ]}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    { label: "Description", value: data.description, dbColumn: "description", type: "textarea", rawValue: data.description },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "schema" && (
                                    <div className="space-y-4">
                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-border bg-card p-4">
                                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Sections</p>
                                                <h3 className="text-2xl font-bold mt-1">{countSections(data.schema)}</h3>
                                            </div>
                                            <div className="rounded-xl border border-border bg-card p-4">
                                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Fields</p>
                                                <h3 className="text-2xl font-bold mt-1">{countFields(data.schema)}</h3>
                                            </div>
                                        </div>

                                        {/* Section breakdown */}
                                        {data.schema?.sections && data.schema.sections.length > 0 ? (
                                            <div className="rounded-xl border border-border bg-card divide-y divide-border">
                                                {data.schema.sections.map((section, i) => (
                                                    <div key={section.id} className="px-5 py-3.5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className="text-[10px] font-bold text-muted-foreground/40 w-5">
                                                                    {String(i + 1).padStart(2, "0")}
                                                                </span>
                                                                <p className="text-sm font-medium truncate">{section.title}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {section.type === "repeater" && (
                                                                    <Badge variant="secondary" className="text-[10px]">Repeater</Badge>
                                                                )}
                                                                <span className="text-xs text-muted-foreground">
                                                                    {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {section.description && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 ml-[1.875rem]">{section.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-muted-foreground">No sections defined yet.</p>
                                                <Link
                                                    href={`/platform-admin/builder/${data.id}`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-foreground hover:underline"
                                                >
                                                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                                    Open Builder to add sections
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
