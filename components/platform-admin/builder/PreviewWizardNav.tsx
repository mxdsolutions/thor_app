"use client";

import { Button } from "@/components/ui/button";
import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon,
    Send as SendIcon,
} from "lucide-react";

interface PreviewWizardNavProps {
    currentIndex: number;
    totalSections: number;
    onPrev: () => void;
    onNext: () => void;
}

/**
 * Bottom-nav strip shown in preview mode so the platform admin can step
 * through the wizard exactly like a tradie will. Mirrors the chrome in
 * `components/reports/wizard/WizardStepContent.tsx` — same buttons, same
 * placement, same icons — but Submit is disabled because there's no real
 * report to submit from the builder.
 */
export function PreviewWizardNav({
    currentIndex,
    totalSections,
    onPrev,
    onNext,
}: PreviewWizardNavProps) {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex >= totalSections - 1;

    return (
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div>
                    {!isFirst && (
                        <Button variant="outline" onClick={onPrev} className="gap-2 text-sm">
                            <ArrowLeftIcon className="w-3.5 h-3.5" />
                            Back
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isLast ? (
                        <>
                            <span className="text-[11px] text-muted-foreground">
                                Preview only — submit is disabled
                            </span>
                            <Button disabled className="gap-2 text-sm">
                                Submit
                                <SendIcon className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    ) : (
                        <Button onClick={onNext} className="gap-2 text-sm">
                            Continue
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
