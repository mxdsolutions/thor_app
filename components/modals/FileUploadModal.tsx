"use client";

import { useCallback, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    IconUpload as UploadIcon,
    IconX as XMarkIcon,
    IconCheck as CheckIcon,
    IconAlertCircle as AlertIcon,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { FILE_MAX_SIZE_BYTES } from "@/lib/validation";
import { formatBytes, fileIconForMime } from "@/lib/file-utils";

type UploadState = "queued" | "uploading" | "done" | "error";

interface QueuedFile {
    id: string;
    file: File;
    state: UploadState;
    error?: string;
}

interface FileUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** When set, all uploads in this batch are attached to this job. */
    jobId?: string | null;
    onUploaded?: () => void;
}

/** Drag-and-drop / picker modal for uploading one or more files. Each file is
 *  POSTed individually so a single failure doesn't take the rest down. */
export function FileUploadModal({ open, onOpenChange, jobId, onUploaded }: FileUploadModalProps) {
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setQueue([]);
        setUploading(false);
        setDragOver(false);
    };

    const addFiles = useCallback((files: FileList | File[]) => {
        const incoming = Array.from(files).map((file) => {
            const oversize = file.size > FILE_MAX_SIZE_BYTES;
            return {
                id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                state: oversize ? ("error" as const) : ("queued" as const),
                error: oversize
                    ? `Exceeds ${Math.round(FILE_MAX_SIZE_BYTES / 1024 / 1024)}MB limit`
                    : undefined,
            };
        });
        setQueue((prev) => [...prev, ...incoming]);
    }, []);

    const removeFromQueue = (id: string) => {
        setQueue((prev) => prev.filter((q) => q.id !== id));
    };

    const handleUpload = async () => {
        const eligible = queue.filter((q) => q.state === "queued");
        if (eligible.length === 0) return;

        setUploading(true);
        let successCount = 0;
        let failCount = 0;

        for (const item of eligible) {
            setQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, state: "uploading" } : q))
            );

            const form = new FormData();
            form.append("file", item.file);
            if (jobId) form.append("job_id", jobId);

            try {
                const res = await fetch("/api/files", { method: "POST", body: form });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Upload failed");
                }
                setQueue((prev) =>
                    prev.map((q) => (q.id === item.id ? { ...q, state: "done" } : q))
                );
                successCount += 1;
            } catch (err) {
                setQueue((prev) =>
                    prev.map((q) =>
                        q.id === item.id
                            ? { ...q, state: "error", error: err instanceof Error ? err.message : "Upload failed" }
                            : q
                    )
                );
                failCount += 1;
            }
        }

        setUploading(false);

        if (successCount > 0) {
            toast.success(`Uploaded ${successCount} file${successCount === 1 ? "" : "s"}`);
            onUploaded?.();
        }
        if (failCount > 0) {
            toast.error(`${failCount} file${failCount === 1 ? "" : "s"} failed to upload`);
        }
        // If everything succeeded, close. If any failed, keep the modal open
        // so the user sees which ones they need to retry.
        if (failCount === 0) {
            reset();
            onOpenChange(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    };

    const queuedCount = queue.filter((q) => q.state === "queued").length;
    const limitMb = Math.round(FILE_MAX_SIZE_BYTES / 1024 / 1024);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Upload files</DialogTitle>
                    <DialogDescription>
                        {jobId
                            ? `Files will be attached to this job.`
                            : `Files will be available across the workspace.`}{" "}
                        Max {limitMb}MB per file.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-3 pb-6">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={cn(
                            "w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors",
                            dragOver
                                ? "border-foreground bg-secondary/40"
                                : "border-border hover:border-foreground/40 bg-secondary/10"
                        )}
                    >
                        <UploadIcon className="w-7 h-7 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                            Drop files here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Up to {limitMb}MB each
                        </p>
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) addFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />

                    {queue.length > 0 && (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {queue.map((item) => {
                                const Icon = fileIconForMime(item.file.type);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
                                    >
                                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatBytes(item.file.size)}
                                                {item.error ? ` · ${item.error}` : ""}
                                            </p>
                                        </div>
                                        {item.state === "uploading" && (
                                            <span className="text-xs text-muted-foreground">Uploading…</span>
                                        )}
                                        {item.state === "done" && (
                                            <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                        )}
                                        {item.state === "error" && (
                                            <AlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                        )}
                                        {item.state === "queued" && !uploading && (
                                            <button
                                                type="button"
                                                onClick={() => removeFromQueue(item.id)}
                                                className="text-muted-foreground hover:text-foreground"
                                                aria-label="Remove"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={queuedCount === 0 || uploading}>
                        {uploading
                            ? "Uploading…"
                            : queuedCount > 0
                                ? `Upload ${queuedCount} file${queuedCount === 1 ? "" : "s"}`
                                : "Upload"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
