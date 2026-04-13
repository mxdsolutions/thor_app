"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";

interface EmailSignatureModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    signatureHtml: string | null;
    onSaved: (html: string | null) => void;
}

export function EmailSignatureModal({ open, onOpenChange, signatureHtml, onSaved }: EmailSignatureModalProps) {
    const [signature, setSignature] = useState(signatureHtml || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setSignature(signatureHtml || "");
        }
    }, [open, signatureHtml]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Treat empty / whitespace-only HTML as no signature
            const isEmpty = !signature || signature.replace(/<[^>]*>/g, "").trim() === "";
            const value = isEmpty ? null : signature;

            const res = await fetch("/api/integrations/outlook", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signature_html: value }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save signature");
            }

            toast.success("Email signature saved");
            onSaved(value);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save signature");
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        setSignature("");
        setSaving(true);
        try {
            const res = await fetch("/api/integrations/outlook", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signature_html: null }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to clear signature");
            }

            toast.success("Email signature cleared");
            onSaved(null);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to clear signature");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Email Signature</DialogTitle>
                    <DialogDescription>
                        Set your email signature. It will be automatically appended to new emails you compose.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <RichTextEditor
                        value={signature}
                        onChange={setSignature}
                        placeholder="Type your email signature..."
                        className="min-h-[200px]"
                    />

                    <div className="flex justify-between pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            disabled={saving || (!signatureHtml && !signature)}
                        >
                            Clear Signature
                        </Button>
                        <div className="flex gap-3">
                            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save Signature"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
