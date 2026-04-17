"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { reportTemplateCreateSchema } from "@/lib/validation";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";

interface CreateReportTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (template: Record<string, unknown>) => void;
}

export function CreateReportTemplateModal({ open, onOpenChange, onCreated }: CreateReportTemplateModalProps) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "",
        slug: "",
        description: "",
        category: "",
    });

    const handleSlugify = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 100);
        setForm((f) => ({ ...f, name, slug }));
    };

    const reset = () => {
        setForm({ name: "", slug: "", description: "", category: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            description: form.description || null,
        };
        const validation = reportTemplateCreateSchema.safeParse(payload);
        if (!validation.success) {
            const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
            toast.error(firstError || "Validation failed");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/platform-admin/report-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to create template");
                return;
            }

            toast.success("Template created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Report Template</DialogTitle>
                    <DialogDescription>Create a report template for tenants to use.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Template Name *</label>
                        <Input
                            autoFocus
                            placeholder="e.g. Building Defect Report"
                            value={form.name}
                            onChange={(e) => handleSlugify(e.target.value)}
                            className="rounded-xl"
                        />
                        {form.slug && (
                            <p className="text-[11px] text-muted-foreground/60 pl-1">
                                Slug: <span className="font-mono">{form.slug}</span>
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Category *</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Select a category...</option>
                            {TEMPLATE_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <textarea
                            placeholder="Brief description of this template..."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!form.name.trim() || !form.slug.trim() || !form.category || saving}>
                            {saving ? "Creating..." : "Create Template"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
