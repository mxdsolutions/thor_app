"use client";

import { use, useCallback, useEffect } from "react";
import { usePlatformReportTemplate } from "@/lib/swr";
import {
    BuilderShell,
    type BuilderTemplateMeta,
    type BuilderTenantBranding,
} from "@/components/platform-admin/builder/BuilderShell";
import type { TemplateSchema } from "@/lib/report-templates/types";
import { LATEST_SCHEMA_VERSION } from "@/lib/report-templates/defaults";
import { toast } from "sonner";

export default function TemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading, mutate } = usePlatformReportTemplate(id);

    const template = data?.item;

    // Document title is patched via useEffect rather than Next.js metadata
    // because this is a "use client" page reading dynamic data from SWR —
    // metadata APIs only run at server-render time. If this ever moves to a
    // server-component wrapper, lift the title into generateMetadata.
    useEffect(() => {
        if (template?.name) {
            document.title = `${template.name} | THOR: Tradie OS`;
        }
    }, [template?.name]);

    const handleSave = async (schema: TemplateSchema, meta: BuilderTemplateMeta) => {
        const res = await fetch(`/api/platform-admin/report-templates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schema,
                name: meta.name,
                category: meta.category || null,
                description: meta.description || null,
                tenant_id: meta.tenant_id,
                report_cover_url: meta.report_cover_url,
            }),
        });
        if (!res.ok) throw new Error("Failed to save");
        toast.success("Template saved");
        mutate();
    };

    // Platform admins can edit any tenant's template, so the preview pulls
    // branding for whichever tenant the template is assigned to (if any).
    // Wrapped in useCallback so BuilderShell sees a stable identity.
    const fetchTenantBranding = useCallback(
        async (): Promise<BuilderTenantBranding | null> => {
            if (!template?.tenant_id) return null;
            try {
                const res = await fetch(`/api/platform-admin/tenants/${template.tenant_id}`);
                if (!res.ok) return null;
                const json = await res.json();
                return json.item ?? json ?? null;
            } catch {
                return null;
            }
        },
        [template?.tenant_id],
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

    // Schema version handling. Legacy templates may have null/undefined schema
    // (created before the schema column existed); treat as a fresh starter.
    // For an explicit version mismatch, refuse to render rather than silently
    // substituting an empty schema — saving over a forward-version template
    // would otherwise destroy data the current build can't represent.
    let schema: TemplateSchema;
    if (!template.schema) {
        schema = { version: LATEST_SCHEMA_VERSION, sections: [] };
    } else if (template.schema.version === LATEST_SCHEMA_VERSION) {
        schema = template.schema;
    } else {
        return (
            <div className="h-screen flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-2">
                    <p className="text-sm font-semibold">This template can&apos;t be opened in the current builder.</p>
                    <p className="text-xs text-muted-foreground">
                        It was saved with schema version{" "}
                        <span className="font-mono">{String(template.schema.version)}</span>, which this
                        build doesn&apos;t understand. Update the app or contact support before editing —
                        opening it here would overwrite the saved data.
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
            fetchTenantBranding={fetchTenantBranding}
        />
    );
}
