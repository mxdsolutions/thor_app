"use client";

import { ReportFormViewer } from "@/components/reports/ReportFormViewer";
import { Button } from "@/components/ui/button";
import { IconArrowLeft as ArrowLeftIcon, IconArrowRight as ArrowRightIcon, IconSend as PaperAirplaneIcon } from "@tabler/icons-react";
import type { TemplateSchema } from "@/lib/report-templates/types";

interface WizardStepContentProps {
    schema: TemplateSchema;
    data: Record<string, unknown>;
    currentIndex: number;
    onChange: (sectionId: string, sectionData: Record<string, unknown> | Record<string, unknown>[]) => void;
    readOnly?: boolean;
    reportId: string;
    tenantId?: string;
    direction: number;
    onPrev: () => void;
    onNext: () => void;
    onSubmit: () => void;
    submitting: boolean;
    reportStatus: string;
}

export function WizardStepContent({
    schema,
    data,
    currentIndex,
    onChange,
    readOnly,
    reportId,
    tenantId,
    direction,
    onPrev,
    onNext,
    onSubmit,
    submitting,
    reportStatus,
}: WizardStepContentProps) {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === schema.sections.length - 1;
    const isSubmitted = reportStatus === "submitted";

    return (
        <>
            <div className="flex-1 overflow-y-auto bg-background">
                <div className="max-w-3xl mx-auto px-4 py-5 sm:p-6 lg:p-8 pb-24">
                    <ReportFormViewer
                        schema={schema}
                        data={data}
                        onChange={onChange}
                        readOnly={readOnly}
                        reportId={reportId}
                        tenantId={tenantId}
                        mode="wizard"
                        currentIndex={currentIndex}
                        direction={direction}
                        borderless
                    />
                </div>
            </div>

            {/* Fixed bottom navigation */}
            <div className="shrink-0 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        {!isFirst && (
                            <Button
                                variant="outline"
                                onClick={onPrev}
                                className="gap-2 text-sm"
                            >
                                <ArrowLeftIcon className="w-3.5 h-3.5" />
                                Back
                            </Button>
                        )}
                    </div>
                    <div>
                        {isLast ? (
                            !isSubmitted && (
                                <Button
                                    onClick={onSubmit}
                                    disabled={submitting}
                                    className="gap-2 text-sm"
                                >
                                    {submitting ? "Submitting..." : "Submit"}
                                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                </Button>
                            )
                        ) : (
                            <Button
                                onClick={onNext}
                                className="gap-2 text-sm"
                            >
                                Continue
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
