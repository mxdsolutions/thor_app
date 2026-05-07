"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    IconDownload as DownloadIcon,
    IconCheck as CheckIcon,
    IconX as XMarkIcon,
} from "@tabler/icons-react";
import { fileIconForMime, formatBytes } from "@/lib/file-utils";

export type FileItem = {
    id: string;
    name: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number;
    job_id: string | null;
    created_at: string;
    archived_at?: string | null;
    uploader?: { id: string; full_name: string | null; email: string | null } | null;
    job?: { id: string; job_title: string; reference_id: string | null } | null;
};

interface FileSideSheetProps {
    file: FileItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

type FileDetailResponse = { item: FileItem & { download_url: string } };

export function FileSideSheet({ file, open, onOpenChange, onUpdate }: FileSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<FileItem | null>(file);
    const [renaming, setRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState("");

    useEffect(() => { setData(file); }, [file]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    // Re-fetch on open to refresh the signed download URL — the list endpoint
    // doesn't include one, and signed URLs only live for 10 minutes anyway.
    const { data: detail } = useSWR<FileDetailResponse>(
        data && open ? `/api/files/${data.id}` : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 5000 }
    );

    const archive = useArchiveAction({
        entityName: "file",
        endpoint: data ? `/api/files/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    const handleRename = useCallback(async () => {
        if (!data) return;
        const trimmed = nameDraft.trim();
        if (!trimmed || trimmed === data.name) {
            setRenaming(false);
            return;
        }
        const res = await fetch(`/api/files/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
            toast.error("Failed to rename");
            return;
        }
        setData((prev) => prev ? { ...prev, name: trimmed } : prev);
        setRenaming(false);
        onUpdate?.();
        toast.success("File renamed");
    }, [data, nameDraft, onUpdate]);

    if (!data) return null;

    const Icon = fileIconForMime(data.mime_type);
    const downloadUrl = detail?.item.download_url;
    const uploaderName = data.uploader?.full_name || data.uploader?.email || "Unknown";

    const tabs = [{ id: "details", label: "Details" }];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<Icon className="w-7 h-7 text-blue-600" />}
            iconBg="bg-blue-500/10"
            title={data.name}
            subtitle={data.job ? `Job · ${data.job.job_title}` : "Workspace file"}
            badge={{
                label: formatBytes(data.size_bytes),
                dotColor: "bg-blue-500",
            }}
            actions={
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={!downloadUrl}
                        onClick={() => {
                            if (downloadUrl) window.open(downloadUrl, "_blank", "noopener");
                        }}
                    >
                        <DownloadIcon className="w-4 h-4 mr-1.5" />
                        Download
                    </Button>
                    {archive.menu}
                </>
            }
            banner={archive.banner}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-sm font-medium text-muted-foreground shrink-0 pt-2">Name</span>
                        {renaming ? (
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                <Input
                                    autoFocus
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void handleRename();
                                        if (e.key === "Escape") setRenaming(false);
                                    }}
                                    className="rounded-lg"
                                />
                                <Button size="icon" variant="ghost" onClick={() => void handleRename()}>
                                    <CheckIcon className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setRenaming(false)}>
                                    <XMarkIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setNameDraft(data.name);
                                    setRenaming(true);
                                }}
                                className="text-sm text-foreground text-right hover:underline truncate max-w-md"
                            >
                                {data.name}
                            </button>
                        )}
                    </div>

                    <Row label="Type" value={data.mime_type || "Unknown"} />
                    <Row label="Size" value={formatBytes(data.size_bytes)} />
                    <Row label="Scope" value={data.job ? `Job · ${data.job.job_title}` : "Workspace"} />
                    <Row label="Uploaded by" value={uploaderName} />
                    <Row
                        label="Uploaded"
                        value={new Date(data.created_at).toLocaleString("en-AU", {
                            dateStyle: "medium",
                            timeStyle: "short",
                        })}
                    />
                </div>
            </div>
        </SideSheetLayout>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm text-foreground text-right truncate max-w-md">{value}</span>
        </div>
    );
}
