"use client";

import { cn } from "@/lib/utils";
import { IconChevronLeft as ChevronLeftIcon, IconChevronRight as ChevronRightIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { SectionDef } from "@/lib/report-templates/types";
import type { SectionStatus } from "@/lib/reports/validation";

interface WizardStepBarProps {
    sections: SectionDef[];
    currentStep: number;
    onStepClick: (index: number) => void;
    onPrev: () => void;
    onNext: () => void;
    validations: SectionStatus[];
}

function ValidationDot({ status }: { status: SectionStatus }) {
    if (status === "complete") {
        return <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />;
    }
    if (status === "incomplete") {
        return <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />;
    }
    return null;
}

export function WizardStepBar({
    sections,
    currentStep,
    onStepClick,
    onPrev,
    onNext,
    validations,
}: WizardStepBarProps) {
    const isFirst = currentStep === 0;
    const isLast = currentStep === sections.length - 1;

    return (
        <div className="h-16 border-t border-border bg-background shrink-0 flex items-center px-3 gap-2">
            {/* Prev button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                disabled={isFirst}
                className="rounded-full shrink-0 h-9 w-9 p-0"
            >
                <ChevronLeftIcon className="w-4 h-4" />
            </Button>

            {/* Step tabs */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto px-1">
                {sections.map((section, index) => (
                    <button
                        key={section.id}
                        onClick={() => onStepClick(index)}
                        className={cn(
                            "group relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer",
                            currentStep === index
                                ? "bg-foreground text-background shadow-sm"
                                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <span
                            className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
                                currentStep === index
                                    ? "bg-background/20 text-background"
                                    : "bg-foreground/10 text-muted-foreground"
                            )}
                        >
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate max-w-[120px]">{section.title}</span>
                        <ValidationDot status={validations[index] ?? "empty"} />
                    </button>
                ))}
            </div>

            {/* Next button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={isLast}
                className="rounded-full shrink-0 h-9 w-9 p-0"
            >
                <ChevronRightIcon className="w-4 h-4" />
            </Button>
        </div>
    );
}
