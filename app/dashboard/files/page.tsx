"use client";

import { useState, useCallback } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import {
    IconSearch as MagnifyingGlassIcon,
    IconUpload as UploadIcon,
} from "@tabler/icons-react";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { FileSideSheet, type FileItem } from "@/components/sheets/FileSideSheet";
import { useFiles, type ArchiveScope } from "@/lib/swr";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { fileIconForMime, formatBytes } from "@/lib/file-utils";

type Scope = "all" | "tenant" | "job";

const columns: DataTableColumn<FileItem>[] = [
    {
        key: "name",
        label: "File",
        render: (f) => {
            const Icon = fileIconForMime(f.mime_type);
            return (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-foreground ring-1 ring-border/50 shrink-0">
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{f.name}</p>
                        {f.mime_type && (
                            <p className="text-xs text-muted-foreground truncate">{f.mime_type}</p>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        key: "scope",
        label: "Scope",
        muted: true,
        className: "hidden sm:table-cell",
        render: (f) => (f.job ? `Job · ${f.job.job_title}` : "Workspace"),
    },
    {
        key: "size",
        label: "Size",
        muted: true,
        render: (f) => formatBytes(f.size_bytes),
    },
    {
        key: "uploader",
        label: "Uploaded by",
        muted: true,
        className: "hidden md:table-cell",
        render: (f) => f.uploader?.full_name || f.uploader?.email || "—",
    },
    {
        key: "created",
        label: "Uploaded",
        muted: true,
        className: "hidden md:table-cell",
        render: (f) =>
            new Date(f.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }),
    },
];

export default function FilesPage() {
    usePageTitle("Files");
    const [showUpload, setShowUpload] = useState(false);
    useMobileHeaderAction(useCallback(() => setShowUpload(true), []));
    const [search, setSearch] = useState("");
    const [scope, setScope] = useState<Scope>("all");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const debouncedSearch = useDebouncedValue(search);

    const { data, isLoading, mutate } = useFiles({
        scope: scope === "tenant" ? "tenant" : "all",
        search: debouncedSearch || undefined,
        archive: archiveScope,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
    });

    const files: FileItem[] = data?.items || [];
    const total: number = data?.total || 0;
    const [selected, setSelected] = useState<FileItem | null>(null);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Files</h1>
                        </div>
                        <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search files..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <MobileFilters>
                                <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Scope" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All files</SelectItem>
                                        <SelectItem value="tenant">Workspace only</SelectItem>
                                    </SelectContent>
                                </Select>
                                <ArchiveScopedStatusSelect
                                    archive={archiveScope}
                                    onArchiveChange={setArchiveScope}
                                    status="All"
                                    onStatusChange={() => { }}
                                    statuses={[]}
                                />
                            </MobileFilters>
                        </div>
                        <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowUpload(true)}>
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                    </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={files}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No files yet. Upload one to get started."
                    onRowClick={setSelected}
                />
            </ScrollableTableLayout>

            <FileUploadModal
                open={showUpload}
                onOpenChange={setShowUpload}
                onUploaded={() => mutate()}
            />

            <FileSideSheet
                file={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate()}
            />
        </>
    );
}
