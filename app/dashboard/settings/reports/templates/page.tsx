"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus as PlusIcon, Pencil as PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportTemplates } from "@/lib/swr";
import { useTenant } from "@/lib/tenant-context";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import { CreateReportTemplateModal } from "@/components/modals/CreateReportTemplateModal";

interface TemplateListItem {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    tenant_id: string | null;
}

const CATEGORY_LABEL = new Map<string, string>(
    TEMPLATE_CATEGORIES.map((c) => [c.value, c.label]),
);

/**
 * Settings → Reports → Templates list. Tenant-scoped: shows only this
 * tenant's templates (legacy / platform-shared templates with tenant_id
 * IS NULL are filtered out — they're read-only from a tenant context and
 * can't be edited via the in-dashboard builder).
 *
 * Each row deep-links to `/builder/{id}` which takes over the full viewport.
 */
export default function ReportTemplatesPage() {
    const tenant = useTenant();
    const [createOpen, setCreateOpen] = useState(false);
    const { data, mutate, isLoading } = useReportTemplates();

    const templates: TemplateListItem[] = ((data?.items as TemplateListItem[]) || []).filter(
        (t) => t.tenant_id !== null,
    );

    const handleCreated = (item: Record<string, unknown>) => {
        mutate();
        // Drop straight into the builder for the freshly created template.
        const id = typeof item?.id === "string" ? item.id : null;
        if (id) window.location.href = `/builder/${id}`;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground max-w-md">
                    Templates control the shape of reports your team fills in. Build
                    one for each kind of inspection, defect, or assessment you produce.
                </p>
                <Button
                    onClick={() => setCreateOpen(true)}
                    variant="outline"
                    className="shrink-0"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Template
                </Button>
            </div>

            {isLoading ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">Loading templates…</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-1.5">
                    <p className="text-sm font-medium">No templates yet</p>
                    <p className="text-xs text-muted-foreground">
                        Create your first template to define the questions your team will answer.
                    </p>
                </div>
            ) : (
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {templates.map((t) => {
                        const categoryLabel = t.category
                            ? CATEGORY_LABEL.get(t.category) ?? t.category.replace(/_/g, " ")
                            : null;
                        return (
                            <Link
                                key={t.id}
                                href={`/builder/${t.id}`}
                                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-secondary/40 transition-colors group"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{t.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {categoryLabel || "No category"}
                                        {t.description ? ` · ${t.description}` : ""}
                                    </p>
                                </div>
                                <PencilIcon className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                        );
                    })}
                </div>
            )}

            <CreateReportTemplateModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                enforceTenantId={tenant.id}
                onCreated={handleCreated}
            />
        </div>
    );
}
