"use client";

import { use, useEffect } from "react";
import { usePlatformReportTemplate } from "@/lib/swr";
import { BuilderShell } from "@/components/platform-admin/builder/BuilderShell";
import type { TemplateSchema } from "@/lib/report-templates/types";
import { toast } from "sonner";

export default function TemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading, mutate } = usePlatformReportTemplate(id);

    const template = data?.item;

    useEffect(() => {
        if (template?.name) {
            document.title = `${template.name} | MXD Admin`;
        }
    }, [template?.name]);

    const handleSave = async (
        schema: TemplateSchema,
        meta: { name: string; category: string; description: string }
    ) => {
        const res = await fetch(`/api/platform-admin/report-templates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schema,
                name: meta.name,
                category: meta.category || null,
                description: meta.description || null,
            }),
        });
        if (!res.ok) throw new Error("Failed to save");
        toast.success("Template saved");
        mutate();
    };

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

    const schema: TemplateSchema =
        template.schema && template.schema.version === 1
            ? template.schema
            : { version: 1, sections: [] };

    return (
        <BuilderShell
            templateId={id}
            initialSchema={schema}
            initialMeta={{
                name: template.name,
                category: template.category || "",
                description: template.description || "",
            }}
            onSave={handleSave}
        />
    );
}
