"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    reportTemplateCreateSchema,
    reportTemplateTenantCreateSchema,
} from "@/lib/validation";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import { slugifyHyphen } from "@/lib/report-templates/ids";
import { TenantSelect } from "@/components/platform-admin/TenantSelect";

interface CreateReportTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (template: Record<string, unknown>) => void;
    /**
     * When provided, the tenant selector is hidden and the modal submits to
     * the tenant-scoped endpoint (`/api/report-templates`) — the server reads
     * the tenant from the auth context, so this prop is purely cosmetic and
     * does NOT need to be a trusted/verified id.
     *
     * Leave undefined for the platform-admin flow: the dropdown appears and
     * the request goes to `/api/platform-admin/report-templates` with an
     * explicit `tenant_id` in the body.
     */
    enforceTenantId?: string;
}

export function CreateReportTemplateModal({
    open,
    onOpenChange,
    onCreated,
    enforceTenantId,
}: CreateReportTemplateModalProps) {
    const tenantScoped = Boolean(enforceTenantId);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "",
        slug: "",
        description: "",
        category: "",
        tenant_id: "",
    });

    const handleSlugify = (name: string) => {
        setForm((f) => ({ ...f, name, slug: slugifyHyphen(name) }));
    };

    const reset = () => {
        setForm({ name: "", slug: "", description: "", category: "", tenant_id: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Tenant-scoped flow: server reads tenant_id from auth context, so we
        // strip it from the body. Platform-admin flow: explicit tenant_id from
        // the picked dropdown.
        const basePayload = {
            name: form.name,
            slug: form.slug,
            description: form.description || null,
            category: form.category,
        };
        const payload = tenantScoped
            ? basePayload
            : { ...basePayload, tenant_id: form.tenant_id };

        const validation = tenantScoped
            ? reportTemplateTenantCreateSchema.safeParse(payload)
            : reportTemplateCreateSchema.safeParse(payload);
        if (!validation.success) {
            const fieldErrors = validation.error.flatten().fieldErrors;
            const firstEntry = Object.entries(fieldErrors)[0];
            const message = firstEntry ? `${firstEntry[0]}: ${firstEntry[1]?.[0] ?? "invalid"}` : "Validation failed";
            // Surface the full failure shape in the console so the user can
            // share it if validation keeps tripping in unexpected ways.
            console.warn("[CreateReportTemplateModal] validation failed", { payload, fieldErrors });
            toast.error(message);
            return;
        }

        setSaving(true);
        try {
            const endpoint = tenantScoped
                ? "/api/report-templates"
                : "/api/platform-admin/report-templates";
            const res = await fetch(endpoint, {
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
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-4 pb-6">
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
                        <Select
                            value={form.category || undefined}
                            onValueChange={(value) => setForm((f) => ({ ...f, category: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATE_CATEGORIES.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!tenantScoped && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Assign to Tenant *</label>
                            <TenantSelect
                                value={form.tenant_id}
                                onChange={(id) => setForm((f) => ({ ...f, tenant_id: id || "" }))}
                                placeholder="Select tenant…"
                            />
                            <p className="text-[11px] text-muted-foreground/60 pl-1">
                                Only this tenant&apos;s users will be able to use this template.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <Textarea
                            placeholder="Brief description of this template..."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="rounded-xl resize-none"
                        />
                    </div>

                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                !form.name.trim() ||
                                !form.slug.trim() ||
                                !form.category ||
                                (!tenantScoped && !form.tenant_id) ||
                                saving
                            }
                        >
                            {saving ? "Creating..." : "Create Template"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
