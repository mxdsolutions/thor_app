"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus as PlusIcon, IconTrash as TrashIcon, IconUpload as ArrowUpTrayIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { SectionDef } from "@/lib/report-templates/types";
import type { PhotoItem } from "@/lib/report-templates/types";
import { uploadReportPhoto } from "@/lib/report-photos";
import { FormField } from "./FormField";

const MAX_BULK_PHOTOS = 20;
const MAX_CONCURRENT = 2;

interface RepeaterSectionProps {
    section: SectionDef;
    items: Record<string, unknown>[];
    onChange: (items: Record<string, unknown>[]) => void;
    readOnly?: boolean;
    reportId?: string;
    tenantId?: string;
}

export function RepeaterSection({ section, items, onChange, readOnly, reportId, tenantId }: RepeaterSectionProps) {
    // Detect if this repeater has a photo_upload field
    const photoField = section.fields.find((f) => f.type === "photo_upload");

    // Bulk upload state
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
    const bulkInputRef = useRef<HTMLInputElement>(null);
    const mountedRef = useRef(true);
    const itemsRef = useRef(items);

    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleAddItem = () => {
        const newItem: Record<string, unknown> = {};
        section.fields.forEach((f) => { newItem[f.id] = null; });
        onChange([...items, newItem]);
    };

    const handleRemoveItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const handleFieldChange = (index: number, fieldId: string, value: unknown) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [fieldId]: value };
        onChange(newItems);
    };

    const handleBulkPhotos = useCallback(async (files: FileList) => {
        if (!photoField || !reportId || !tenantId) {
            toast.error("Save the report first before uploading photos");
            return;
        }

        const validFiles: File[] = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) {
                toast.error(`${file.name} is not an image`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 10MB limit`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        if (validFiles.length > MAX_BULK_PHOTOS) {
            toast.error(`Maximum ${MAX_BULK_PHOTOS} photos at a time`);
            validFiles.splice(MAX_BULK_PHOTOS);
        }

        setBulkUploading(true);
        setBulkProgress({ done: 0, total: validFiles.length });

        // Process files with concurrency limit
        let completed = 0;
        const queue = [...validFiles];

        const processNext = async (): Promise<void> => {
            const file = queue.shift();
            if (!file || !mountedRef.current) return;

            try {
                const sectionId = `${section.id}_${itemsRef.current.length}`;
                const photo = await uploadReportPhoto(file, tenantId!, reportId!, sectionId, photoField.id);

                if (!mountedRef.current) return;

                // Create a new repeater item with this photo pre-filled
                const newItem: Record<string, unknown> = {};
                section.fields.forEach((f) => { newItem[f.id] = null; });
                newItem[photoField.id] = [photo] as PhotoItem[];

                const updatedItems = [...itemsRef.current, newItem];
                itemsRef.current = updatedItems;
                onChange(updatedItems);
            } catch {
                toast.error(`Failed to upload ${file.name}`);
            }

            completed++;
            if (mountedRef.current) {
                setBulkProgress({ done: completed, total: validFiles.length });
            }

            // Process next file in queue
            await processNext();
        };

        // Start up to MAX_CONCURRENT workers
        const workers = Array.from(
            { length: Math.min(MAX_CONCURRENT, validFiles.length) },
            () => processNext()
        );
        await Promise.all(workers);

        if (mountedRef.current) {
            setBulkUploading(false);
            setBulkProgress({ done: 0, total: 0 });
        }
    }, [photoField, reportId, tenantId, section, onChange]);

    const canAdd = !section.maxItems || items.length < section.maxItems;
    const canRemove = !section.minItems || items.length > section.minItems;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    {section.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                </div>
                {!readOnly && canAdd && (
                    <div className="flex items-center gap-2">
                        {photoField && (
                            <>
                                <input
                                    ref={bulkInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) handleBulkPhotos(e.target.files);
                                        e.target.value = "";
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => bulkInputRef.current?.click()}
                                    disabled={bulkUploading}
                                >
                                    <ArrowUpTrayIcon className="w-3.5 h-3.5 mr-1" />
                                    Upload Photos
                                </Button>
                            </>
                        )}
                        <Button variant="outline" size="sm" className="text-xs" onClick={handleAddItem}>
                            <PlusIcon className="w-3.5 h-3.5 mr-1" />
                            {section.addLabel || "Add Item"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Bulk upload progress */}
            <AnimatePresence>
                {bulkUploading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-border bg-card p-4 space-y-2.5"
                    >
                        <p className="text-sm font-medium text-foreground">
                            Uploading {bulkProgress.done} of {bulkProgress.total} photos...
                        </p>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-foreground rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${bulkProgress.total > 0 ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {items.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                    No items yet. Click &quot;{section.addLabel || "Add Item"}&quot; to add one.
                </div>
            ) : (
                items.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {section.title.replace(/s$/, "")} #{index + 1}
                            </h4>
                            {!readOnly && canRemove && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    onClick={() => handleRemoveItem(index)}
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-4">
                                {section.fields.map((field) => {
                                    const isHalf = field.width === "half" && field.type !== "heading";
                                    return (
                                        <div
                                            key={field.id}
                                            className={isHalf ? "col-span-1" : "col-span-2"}
                                        >
                                            <FormField
                                                field={field}
                                                value={item[field.id]}
                                                onChange={(value) => handleFieldChange(index, field.id, value)}
                                                readOnly={readOnly}
                                                reportId={reportId}
                                                sectionId={`${section.id}_${index}`}
                                                tenantId={tenantId}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
