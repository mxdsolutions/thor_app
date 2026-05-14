"use client";

import { useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Camera as CameraIcon, X as XMarkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FILE_MAX_SIZE_BYTES, RECEIPT_CATEGORIES, type ReceiptCategory } from "@/lib/validation";
import { formatBytes } from "@/lib/file-utils";

const CATEGORY_LABELS: Record<ReceiptCategory, string> = {
    materials: "Materials",
    labour: "Labour",
    fuel: "Fuel",
    tools: "Tools",
    meals: "Meals",
    other: "Other",
};

interface CreateReceiptModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId: string;
    onCreated?: () => void;
}

export function CreateReceiptModal({ open, onOpenChange, jobId, onCreated }: CreateReceiptModalProps) {
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [vendor, setVendor] = useState("");
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState("");
    const [gst, setGst] = useState("");
    const [category, setCategory] = useState<ReceiptCategory | "">("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhoto(null);
        setPhotoPreview(null);
        setVendor("");
        setDate(new Date().toISOString().slice(0, 10));
        setAmount("");
        setGst("");
        setCategory("");
        setNotes("");
        setSaving(false);
    };

    const handleClose = (next: boolean) => {
        if (!next) reset();
        onOpenChange(next);
    };

    const handlePhotoPick = (file: File) => {
        if (file.size > FILE_MAX_SIZE_BYTES) {
            toast.error(`Photo exceeds ${Math.round(FILE_MAX_SIZE_BYTES / 1024 / 1024)}MB limit`);
            return;
        }
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!photo) {
            toast.error("Add a photo of the receipt");
            return;
        }

        setSaving(true);
        try {
            // 1. Upload the photo through the existing files pipeline so it
            //    lands in tenant-files with the same RLS / size guards as
            //    every other tenant file.
            const fileForm = new FormData();
            fileForm.append("file", photo);
            fileForm.append("job_id", jobId);
            const fileRes = await fetch("/api/files", { method: "POST", body: fileForm });
            if (!fileRes.ok) {
                const err = await fileRes.json().catch(() => ({}));
                throw new Error(err.error || "Photo upload failed");
            }
            const { item: fileItem } = await fileRes.json();

            // 2. Create the receipt row pointing at that file.
            const parsedAmount = amount.trim() ? Number(amount) : null;
            const parsedGst = gst.trim() ? Number(gst) : null;
            const receiptRes = await fetch("/api/receipts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    job_id: jobId,
                    file_id: fileItem.id,
                    receipt_date: date || null,
                    vendor_name: vendor.trim() || null,
                    amount: parsedAmount,
                    gst_amount: parsedGst,
                    category: category || null,
                    notes: notes.trim() || null,
                }),
            });
            if (!receiptRes.ok) {
                const err = await receiptRes.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save receipt");
            }

            toast.success("Receipt added");
            onCreated?.();
            reset();
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save receipt");
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add receipt</DialogTitle>
                    <DialogDescription>
                        Attach a photo and the key details. You can edit later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-4 pb-6">
                        {photoPreview ? (
                            <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photoPreview}
                                    alt="Receipt preview"
                                    className="w-full max-h-64 object-contain bg-secondary/30"
                                />
                                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t border-border">
                                    <span className="truncate">{photo?.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                                            setPhoto(null);
                                            setPhotoPreview(null);
                                        }}
                                        className="ml-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className={cn(
                                    "w-full rounded-2xl border-2 border-dashed border-border hover:border-foreground/40 bg-secondary/10 p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors"
                                )}
                            >
                                <CameraIcon className="w-7 h-7 text-muted-foreground" />
                                <p className="text-sm font-medium">Add a photo of the receipt</p>
                                <p className="text-xs text-muted-foreground">
                                    Up to {Math.round(FILE_MAX_SIZE_BYTES / 1024 / 1024)}MB
                                    {photo ? ` · ${formatBytes(photo.size)}` : ""}
                                </p>
                            </button>
                        )}
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoPick(file);
                                e.target.value = "";
                            }}
                        />

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                            <Input
                                placeholder="Bunnings, Reece, Shell, …"
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Category</label>
                                <Select value={category} onValueChange={(v) => setCategory(v as ReceiptCategory)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pick one" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RECEIPT_CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Total (inc. GST)</label>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">GST</label>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={gst}
                                    onChange={(e) => setGst(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Notes</label>
                            <textarea
                                rows={2}
                                placeholder="Optional"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!photo || saving}>
                            {saving ? "Saving…" : "Save receipt"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
