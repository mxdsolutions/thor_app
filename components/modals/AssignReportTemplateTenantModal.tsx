"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { TenantSelect } from "@/components/platform-admin/TenantSelect";
import type { ReportTemplate } from "@/lib/report-templates/types";

interface AssignReportTemplateTenantModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Null when no row is targeted (e.g. modal closing). */
    template: ReportTemplate | null;
    /** Fires after a successful PATCH — parent should re-fetch the list. */
    onAssigned: () => void;
}

export function AssignReportTemplateTenantModal({
    open,
    onOpenChange,
    template,
    onAssigned,
}: AssignReportTemplateTenantModalProps) {
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Reset the picker each time the modal opens, so reopening on a different
    // row doesn't carry over the previous selection.
    useEffect(() => {
        if (open) setTenantId(null);
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!template || !tenantId) return;

        setSaving(true);
        try {
            const res = await fetch(
                `/api/platform-admin/report-templates/${template.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenant_id: tenantId }),
                },
            );
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data.error || "Failed to assign tenant");
                return;
            }

            toast.success("Template assigned");
            onAssigned();
            onOpenChange(false);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign template to tenant</DialogTitle>
                    <DialogDescription>
                        {template
                            ? <>Choose which tenant <span className="font-medium text-foreground">{template.name}</span> should be available to.</>
                            : "Choose which tenant this template should be available to."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogBody className="space-y-4 pb-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Tenant *</label>
                            <TenantSelect
                                value={tenantId}
                                onChange={setTenantId}
                                placeholder="Select tenant…"
                            />
                            <p className="text-[11px] text-muted-foreground/60 pl-1">
                                Only this tenant&apos;s users will be able to use this template.
                            </p>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!tenantId || saving}>
                            {saving ? "Assigning..." : "Assign"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
