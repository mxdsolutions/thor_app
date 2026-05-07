"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import { FileSideSheet, type FileItem } from "@/components/sheets/FileSideSheet";
import { fileIconForMime, formatBytes } from "@/lib/file-utils";

interface Props {
    jobId: string;
    files: FileItem[];
    onOpenUpload: () => void;
}

export function JobFilesTab({ jobId, files, onOpenUpload }: Props) {
    const [selected, setSelected] = useState<FileItem | null>(null);

    return (
        <div className="space-y-2 px-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-semibold text-foreground">Files</p>
                <Button size="sm" onClick={onOpenUpload}>
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    Upload
                </Button>
            </div>
            {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No files yet</p>
            ) : files.map((f) => {
                const FileIcon = fileIconForMime(f.mime_type);
                return (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelected(f)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                                <p className="font-medium truncate">{f.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatBytes(f.size_bytes)}
                                    {f.mime_type ? ` · ${f.mime_type}` : ""}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
            <FileSideSheet
                file={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate(`/api/files?job_id=${jobId}`)}
            />
        </div>
    );
}
