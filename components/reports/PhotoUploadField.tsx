"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { IconPhoto as PhotoIcon, IconTrash as TrashIcon, IconUpload as ArrowUpTrayIcon, IconRefresh as ArrowPathIcon, IconX as XMarkIcon, IconEdit as PencilSquareIcon } from "@tabler/icons-react";
import { uploadReportPhoto, deleteReportPhoto } from "@/lib/report-photos";
import { PhotoLightbox } from "./PhotoLightbox";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/lib/report-templates/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UploadStatus = "pending" | "uploading" | "done" | "failed";

interface UploadingFile {
    id: string;
    file: File;
    localPreviewUrl: string;
    status: UploadStatus;
    result?: PhotoItem;
    error?: string;
}

const MAX_CONCURRENT = 2;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PhotoUploadFieldProps {
    photos: PhotoItem[];
    onChange: (photos: unknown) => void;
    readOnly?: boolean;
    reportId?: string;
    sectionId?: string;
    fieldId?: string;
    tenantId?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PhotoUploadField({
    photos,
    onChange,
    readOnly,
    reportId,
    sectionId,
    fieldId,
    tenantId,
}: PhotoUploadFieldProps) {
    const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingPhotosRef = useRef<PhotoItem[]>(photos);
    const activeUploadsRef = useRef(0);
    const mountedRef = useRef(true);

    // Keep pendingPhotosRef in sync with props
    useEffect(() => {
        pendingPhotosRef.current = photos;
    }, [photos]);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Revoke object URLs when queue items are done or component unmounts
    useEffect(() => {
        return () => {
            uploadQueue.forEach((item) => {
                if (item.localPreviewUrl) {
                    URL.revokeObjectURL(item.localPreviewUrl);
                }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------------------------------------------------------------- */
    /*  Upload queue processor                                          */
    /* ---------------------------------------------------------------- */

    const processQueue = useCallback(() => {
        if (!mountedRef.current) return;
        if (activeUploadsRef.current >= MAX_CONCURRENT) return;
        if (!reportId || !sectionId || !fieldId || !tenantId) return;

        setUploadQueue((prev) => {
            const nextPending = prev.find((f) => f.status === "pending");
            if (!nextPending) return prev;

            activeUploadsRef.current += 1;

            // Mark as uploading
            const updated = prev.map((f) =>
                f.id === nextPending.id ? { ...f, status: "uploading" as const } : f
            );

            // Fire the upload (async, outside the setState)
            uploadReportPhoto(nextPending.file, tenantId!, reportId!, sectionId!, fieldId!)
                .then((result) => {
                    if (!mountedRef.current) return;

                    // Add to accumulated photos and call onChange
                    pendingPhotosRef.current = [...pendingPhotosRef.current, result];
                    onChange(pendingPhotosRef.current);

                    // Revoke local preview URL since we now have the real URL
                    URL.revokeObjectURL(nextPending.localPreviewUrl);

                    setUploadQueue((q) =>
                        q.filter((f) => f.id !== nextPending.id)
                    );
                })
                .catch((err) => {
                    if (!mountedRef.current) return;

                    setUploadQueue((q) =>
                        q.map((f) =>
                            f.id === nextPending.id
                                ? { ...f, status: "failed" as const, error: err?.message || "Upload failed" }
                                : f
                        )
                    );
                })
                .finally(() => {
                    activeUploadsRef.current -= 1;
                    // Process next in queue
                    if (mountedRef.current) {
                        // Use setTimeout to avoid calling processQueue inside setState
                        setTimeout(() => processQueue(), 0);
                    }
                });

            return updated;
        });

        // Try to fill the second concurrent slot
        if (activeUploadsRef.current < MAX_CONCURRENT) {
            setTimeout(() => processQueue(), 0);
        }
    }, [reportId, sectionId, fieldId, tenantId, onChange]);

    /* ---------------------------------------------------------------- */
    /*  Handlers                                                        */
    /* ---------------------------------------------------------------- */

    const handleFiles = useCallback(
        (files: FileList) => {
            if (!reportId || !sectionId || !fieldId || !tenantId) {
                toast.error("Save the report first before uploading photos");
                return;
            }

            const newEntries: UploadingFile[] = [];

            for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) {
                    toast.error(`${file.name} is not an image`);
                    continue;
                }
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`${file.name} exceeds 10MB limit`);
                    continue;
                }
                newEntries.push({
                    id: crypto.randomUUID(),
                    file,
                    localPreviewUrl: URL.createObjectURL(file),
                    status: "pending",
                });
            }

            if (newEntries.length === 0) return;

            setUploadQueue((prev) => [...prev, ...newEntries]);

            // Kick off processing after state updates
            setTimeout(() => processQueue(), 0);
        },
        [reportId, sectionId, fieldId, tenantId, processQueue]
    );

    const handleRetry = useCallback(
        (id: string) => {
            setUploadQueue((prev) =>
                prev.map((f) =>
                    f.id === id ? { ...f, status: "pending" as const, error: undefined } : f
                )
            );
            setTimeout(() => processQueue(), 0);
        },
        [processQueue]
    );

    const handleDismiss = useCallback((id: string) => {
        setUploadQueue((prev) => {
            const item = prev.find((f) => f.id === id);
            if (item) URL.revokeObjectURL(item.localPreviewUrl);
            return prev.filter((f) => f.id !== id);
        });
    }, []);

    const handleCancelRemaining = useCallback(() => {
        setUploadQueue((prev) => {
            const cancelled = prev.filter((f) => f.status === "pending");
            cancelled.forEach((f) => URL.revokeObjectURL(f.localPreviewUrl));
            return prev.filter((f) => f.status !== "pending");
        });
    }, []);

    const handleDelete = async (index: number) => {
        const photo = photos[index];
        try {
            await deleteReportPhoto(photo.url);
        } catch {
            // Continue even if storage delete fails
        }
        onChange(photos.filter((_, i) => i !== index));
    };

    const handleCaptionChange = useCallback(
        (index: number, caption: string) => {
            const updated = photos.map((p, i) =>
                i === index ? { ...p, caption } : p
            );
            onChange(updated);
        },
        [photos, onChange]
    );

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (readOnly || !e.dataTransfer.files.length) return;
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!readOnly) setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    /* ---------------------------------------------------------------- */
    /*  Derived state                                                    */
    /* ---------------------------------------------------------------- */

    const inFlightItems = uploadQueue.filter(
        (f) => f.status === "pending" || f.status === "uploading" || f.status === "failed"
    );
    const totalInBatch = uploadQueue.length;
    const doneCount = uploadQueue.filter((f) => f.status === "done").length;
    const activeAndDone =
        uploadQueue.filter((f) => f.status === "uploading" || f.status === "done").length;
    const isUploading = uploadQueue.some(
        (f) => f.status === "pending" || f.status === "uploading"
    );
    const failedCount = uploadQueue.filter((f) => f.status === "failed").length;
    const progressPercent =
        totalInBatch > 0 ? Math.round((doneCount / totalInBatch) * 100) : 0;

    const hasPhotos = photos.length > 0 || inFlightItems.length > 0;

    /* ---------------------------------------------------------------- */
    /*  Render                                                           */
    /* ---------------------------------------------------------------- */

    return (
        <div className="space-y-3">
            {/* Photo Grid */}
            {hasPhotos && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Completed photos */}
                    {photos.map((photo, index) => (
                        <motion.div
                            key={photo.url}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="relative group rounded-xl border border-border overflow-hidden bg-muted"
                        >
                            <div
                                className="aspect-[4/3] relative cursor-pointer"
                                onClick={() => !readOnly ? setLightboxIndex(index) : undefined}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.url}
                                    alt={photo.caption || photo.filename}
                                    className="w-full h-full object-cover"
                                />
                                {/* Hover overlay for edit */}
                                {!readOnly && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <PencilSquareIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                                {/* Delete button */}
                                {!readOnly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(index);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="p-2">
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {photo.caption || photo.filename}
                                </p>
                            </div>
                        </motion.div>
                    ))}

                    {/* In-flight uploads */}
                    <AnimatePresence>
                        {inFlightItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="relative rounded-xl border border-border overflow-hidden bg-muted"
                            >
                                <div className="aspect-[4/3] relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={item.localPreviewUrl}
                                        alt={item.file.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Status overlay */}
                                    {item.status === "pending" && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="text-[11px] font-medium text-white/80">
                                                Queued
                                            </span>
                                        </div>
                                    )}
                                    {item.status === "uploading" && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                    {item.status === "failed" && (
                                        <div className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center gap-2">
                                            <span className="text-[11px] font-medium text-white">
                                                Failed
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleRetry(item.id)}
                                                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                                                    title="Retry"
                                                >
                                                    <ArrowPathIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDismiss(item.id)}
                                                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                                                    title="Dismiss"
                                                >
                                                    <XMarkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {item.file.name}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Upload Progress Bar */}
            <AnimatePresence>
                {isUploading && totalInBatch > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-border bg-card p-4 space-y-2.5"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                                Uploading {activeAndDone} of {totalInBatch}...
                            </p>
                            <button
                                onClick={handleCancelRemaining}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel remaining
                            </button>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-foreground rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                        </div>
                        {failedCount > 0 && (
                            <p className="text-xs text-red-500">
                                {failedCount} upload{failedCount !== 1 ? "s" : ""} failed
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Area */}
            {!readOnly && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                        dragOver
                            ? "border-foreground/40 bg-secondary/50"
                            : "border-border hover:border-foreground/30"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />
                    <div className="flex justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            {hasPhotos ? (
                                <ArrowUpTrayIcon className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <PhotoIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {hasPhotos
                            ? "Add more photos"
                            : "Drop photos here or click to upload"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        JPG, PNG, WebP up to 10MB
                    </p>
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <PhotoLightbox
                    photos={photos}
                    initialIndex={lightboxIndex}
                    open={lightboxIndex !== null}
                    onOpenChange={(open) => {
                        if (!open) setLightboxIndex(null);
                    }}
                    onCaptionChange={handleCaptionChange}
                    readOnly={readOnly}
                />
            )}
        </div>
    );
}
