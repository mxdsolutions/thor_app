"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { usePlatformReportTemplate } from "@/lib/swr";
import { ReportFormViewer } from "@/components/reports/ReportFormViewer";
import { Button } from "@/components/ui/button";
import { IconArrowLeft as ArrowLeftIcon, IconArrowRight as ArrowRightIcon, IconRefresh as ArrowPathIcon, IconList as ListBulletIcon, IconListDetails as QueueListIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { TemplateSchema } from "@/lib/report-templates/types";

type ViewMode = "steps" | "scroll";

export default function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = usePlatformReportTemplate(id);
    const [formKey, setFormKey] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>("steps");
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);

    const template = data?.item;

    const handleChange = useCallback((sectionId: string, sectionData: Record<string, unknown> | Record<string, unknown>[]) => {
        setFormData((prev) => ({ ...prev, [sectionId]: sectionData }));
    }, []);

    const handleReset = () => {
        setFormData({});
        setCurrentStep(0);
        setFormKey((k) => k + 1);
    };

    const goToStep = useCallback((index: number) => {
        setDirection(index > currentStep ? 1 : -1);
        setCurrentStep(index);
    }, [currentStep]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading preview...</div>
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

    const isFirst = currentStep === 0;
    const isLast = currentStep === schema.sections.length - 1;

    return (
        <div className={cn("min-h-screen bg-background", viewMode === "steps" && "h-screen flex flex-col")}>
            {/* Top bar */}
            <div className="sticky top-0 z-20 h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href={`/platform-admin/builder/${id}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back to Builder
                    </Link>
                    <div className="h-5 w-px bg-border" />
                    <h1 className="text-sm font-semibold truncate">{template.name}</h1>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 bg-secondary px-2 py-0.5 rounded-md shrink-0">
                        Preview
                    </span>
                    {viewMode === "steps" && schema.sections.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                            Step {currentStep + 1} of {schema.sections.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex items-center rounded-full border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode("steps")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-8 text-xs font-medium transition-colors",
                                viewMode === "steps"
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <QueueListIcon className="w-3.5 h-3.5" />
                            Steps
                        </button>
                        <button
                            onClick={() => setViewMode("scroll")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-8 text-xs font-medium transition-colors",
                                viewMode === "scroll"
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ListBulletIcon className="w-3.5 h-3.5" />
                            Scroll
                        </button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full h-8 text-xs gap-1.5"
                        onClick={handleReset}
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Reset
                    </Button>
                </div>
            </div>

            {/* Content */}
            {schema.sections.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        This template has no sections yet. Add sections in the builder first.
                    </p>
                </div>
            ) : viewMode === "steps" ? (
                <div className="flex-1 overflow-y-auto" key={formKey}>
                    <div className="max-w-3xl mx-auto p-6 lg:p-8">
                        <ReportFormViewer
                            schema={schema}
                            data={formData}
                            onChange={handleChange}
                            mode="wizard"
                            currentIndex={currentStep}
                            direction={direction}
                            reportId="preview"
                            borderless
                        />

                        {/* Navigation buttons */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                            <div>
                                {!isFirst && (
                                    <Button
                                        variant="outline"
                                        onClick={() => goToStep(currentStep - 1)}
                                        className="rounded-full gap-2 text-xs"
                                    >
                                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                                        Back
                                    </Button>
                                )}
                            </div>
                            <div>
                                {!isLast && (
                                    <Button
                                        onClick={() => goToStep(currentStep + 1)}
                                        className="rounded-full gap-2 text-xs"
                                    >
                                        Continue
                                        <ArrowRightIcon className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto p-6 lg:p-8" key={formKey}>
                    <ReportFormViewer
                        schema={schema}
                        data={formData}
                        onChange={handleChange}
                        mode="scroll"
                        reportId="preview"
                    />
                </div>
            )}
        </div>
    );
}
