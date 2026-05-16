"use client";

import { use, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useReportTemplate } from "@/lib/swr";
import {
    BuilderShell,
    type BuilderTemplateMeta,
    type BuilderTenantBranding,
} from "@/components/platform-admin/builder/BuilderShell";
import type { TemplateSchema } from "@/lib/report-templates/types";
import { LATEST_SCHEMA_VERSION } from "@/lib/report-templates/defaults";
import { ROUTES } from "@/lib/routes";

/**
 * In-dashboard report-template builder. Mirrors the platform-admin wrapper
 * at app/platform-admin/builder/[id]/page.tsx but talks exclusively to the
 * tenant-scoped routes:
 *   - GET / PATCH `/api/report-templates/:id` (tenant_id from auth context)
 *   - GET `/api/tenants/current` for PDF preview branding
 *
 * The builder component itself is host-agnostic; the differences live here
 * in the wrapper (back-link, fetch endpoints).
 */
export default function DashboardTemplateBuilderPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const { data, isLoading, mutate } = useReportTemplate(id);

    const template = data?.item;

    // Document title is patched via useEffect rather than Next.js metadata
    // because this is a "use client" page reading dynamic data from SWR —
    // metadata APIs only run at server-render time.
    useEffect(() => {
        if (template?.name) {
            document.title = `${template.name} | THOR: Tradie OS`;
        }
    }, [template?.name]);

    const handleSave = async (schema: TemplateSchema, meta: BuilderTemplateMeta) => {
        const res = await fetch(`/api/report-templates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schema,
                name: meta.name,
                category: meta.category || null,
                description: meta.description || null,
                // tenant_id intentionally omitted — the tenant-scoped PATCH
                // route ignores it and strips it from the body; sending it
                // would be a no-op at best.
                report_cover_url: meta.report_cover_url,
            }),
        });
        if (!res.ok) throw new Error("Failed to save");
        toast.success("Template saved");
        mutate();
    };

    // Dashboard variant: PDF preview always uses the caller's own tenant
    // (auth context resolves it), so no tenant_id arg needed.
    const fetchTenantBranding = useCallback(
        async (): Promise<BuilderTenantBranding | null> => {
            try {
                const res = await fetch("/api/tenants/current");
                if (!res.ok) return null;
                const json = await res.json();
                return json.item ?? null;
            } catch {
                return null;
            }
        },
        [],
    );

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading template...</div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Template not found.</div>
            </div>
        );
    }

    // Schema version handling — see app/platform-admin/builder/[id]/page.tsx
    // for the rationale. Same shape: null/undefined → fresh starter;
    // version === LATEST → use; anything else → refuse to render.
    let schema: TemplateSchema;
    if (!template.schema) {
        schema = { version: LATEST_SCHEMA_VERSION, sections: [] };
    } else if (template.schema.version === LATEST_SCHEMA_VERSION) {
        schema = template.schema;
    } else {
        return (
            <div className="h-screen flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-2">
                    <p className="text-sm font-semibold">
                        This template can&apos;t be opened in the current builder.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        It was saved with schema version{" "}
                        <span className="font-mono">{String(template.schema.version)}</span>, which
                        this build doesn&apos;t understand. Update the app or contact support before
                        editing — opening it here would overwrite the saved data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <BuilderShell
            templateId={id}
            initialSchema={schema}
            initialMeta={{
                name: template.name,
                category: template.category || "",
                description: template.description || "",
                tenant_id: template.tenant_id ?? null,
                report_cover_url: template.report_cover_url ?? null,
            }}
            onSave={handleSave}
            backHref={ROUTES.SETTINGS_REPORT_TEMPLATES}
            backLabel="Templates"
            fetchTenantBranding={fetchTenantBranding}
        />
    );
}
