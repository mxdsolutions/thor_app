"use client";

import { useState } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus as PlusIcon, Search as MagnifyingGlassIcon, Wrench as WrenchScrewdriverIcon } from "lucide-react";
import { CreateReportTemplateModal } from "@/components/modals/CreateReportTemplateModal";
import { ReportTemplateSideSheet } from "@/components/sheets/ReportTemplateSideSheet";
import { usePlatformReportTemplates } from "@/lib/swr";
import { TableSkeleton } from "@/components/ui/skeleton";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import type { ReportTemplate } from "@/lib/report-templates/types";

const CATEGORY_FILTERS = [
    { label: "All Categories", value: "All" },
    ...TEMPLATE_CATEGORIES,
];

function countFields(schema: ReportTemplate["schema"]): number {
    if (!schema?.sections) return 0;
    return schema.sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);
}

export default function ReportTemplatesPage() {
    usePageTitle("Report Templates");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [createOpen, setCreateOpen] = useState(false);
    const [sheetTemplateId, setSheetTemplateId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const { data, isLoading, mutate } = usePlatformReportTemplates(search, categoryFilter === "All" ? "" : categoryFilter);

    const templates: ReportTemplate[] = data?.items || [];

    const handleRowClick = (templateId: string) => {
        setSheetTemplateId(templateId);
        setSheetOpen(true);
    };

    return (
        <>
            <ScrollableTableLayout
                header={
                    <>
                        <DashboardControls>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 max-w-md">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search templates..."
                                        className="pl-9 rounded-xl border-border/50"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_FILTERS.map((f) => (
                                            <SelectItem key={f.value} value={f.value}>
                                                {f.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="px-6 shrink-0" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                New Template
                            </Button>
                        </DashboardControls>
                    </>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Template</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Category</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Fields</th>
                            <th className={tableHeadCell + " px-4"}>Status</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Created</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <TableSkeleton rows={6} columns={6} />
                        ) : templates.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No templates found.</td>
                            </tr>
                        ) : (
                            templates.map((template) => (
                                <tr
                                    key={template.id}
                                    className={tableRow + " group cursor-pointer"}
                                    onClick={() => handleRowClick(template.id)}
                                >
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{template.name}</p>
                                            {template.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-xs">{template.description}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell capitalize"}>
                                        {template.category?.replace(/_/g, " ") || "\u2014"}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {countFields(template.schema)}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                template.is_active ? "bg-emerald-500" : "bg-gray-400"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {template.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {new Date(template.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                                    </td>
                                    <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-lg h-8 w-8 text-muted-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`/platform-admin/builder/${template.id}`, "_blank");
                                            }}
                                            title="Open Builder"
                                        >
                                            <WrenchScrewdriverIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </ScrollableTableLayout>

            <CreateReportTemplateModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(template) => {
                    mutate();
                    window.open(`/platform-admin/builder/${(template as { id: string }).id}`, "_blank");
                }}
            />

            <ReportTemplateSideSheet
                templateId={sheetTemplateId}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onUpdate={() => mutate()}
            />
        </>
    );
}
