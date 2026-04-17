"use client";

import { use } from "react";
import Link from "next/link";
import { usePlatformReportTemplate } from "@/lib/swr";
import { TemplateBuilder } from "@/components/platform-admin/TemplateBuilder";
import { IconArrowLeft as ArrowLeftIcon, IconTools as WrenchScrewdriverIcon } from "@tabler/icons-react";
import type { TemplateSchema } from "@/lib/report-templates/types";

export default function TemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading, mutate } = usePlatformReportTemplate(id);

    const template = data?.item;

    const handleSave = async (schema: TemplateSchema) => {
        const res = await fetch(`/api/platform-admin/report-templates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ schema }),
        });
        if (!res.ok) throw new Error("Failed to save");
        mutate();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">Loading template...</div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">Template not found.</div>
            </div>
        );
    }

    const schema: TemplateSchema = template.schema && template.schema.version === 1
        ? template.schema
        : { version: 1, sections: [] };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
                <Link
                    href="/platform-admin/report-templates"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Templates
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold truncate">{template.name}</h1>
                    {template.description && (
                        <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    )}
                </div>
                <Link
                    href={`/platform-admin/builder/${id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors shrink-0"
                >
                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                    Open Builder
                </Link>
            </div>
            <div className="flex-1 overflow-hidden">
                <TemplateBuilder
                    templateId={id}
                    initialSchema={schema}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
