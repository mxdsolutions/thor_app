"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { IconMenu2 as Bars3Icon, IconX as XMarkIcon, IconArrowLeft as ArrowLeftIcon } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SectionDef } from "@/lib/report-templates/types";
import type { SectionStatus } from "@/lib/reports/validation";

interface WizardTopBarProps {
    reportTitle: string;
    currentStep: number;
    totalSteps: number;
    saveStatus: "idle" | "saving" | "saved";
    reportStatus: string;
    sections: SectionDef[];
    validations: SectionStatus[];
    onStepClick: (index: number) => void;
}

function StatusPill({ status }: { status: SectionStatus }) {
    if (status === "complete") {
        return (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Complete
            </span>
        );
    }
    if (status === "incomplete") {
        return (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                Incomplete
            </span>
        );
    }
    return null;
}

export function WizardTopBar({
    reportTitle,
    currentStep,
    totalSteps,
    saveStatus,
    reportStatus,
    sections,
    validations,
    onStepClick,
}: WizardTopBarProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const isSubmitted = reportStatus === "submitted";

    const handleStepClick = (index: number) => {
        onStepClick(index);
        setDrawerOpen(false);
    };

    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

    return (
        <>
            {/* Progress bar */}
            <div className="h-1 bg-secondary shrink-0">
                <motion.div
                    className="h-full bg-foreground"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                />
            </div>

            <div className="relative h-12 border-b border-border bg-background flex items-center justify-between px-3 sm:px-4 shrink-0">
                {/* Left */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative z-10">
                    <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                        <Bars3Icon className="w-4.5 h-4.5" />
                    </button>
                    <Link
                        href={ROUTES.OPS_REPORTS}
                        className="hidden sm:flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        Reports
                    </Link>
                </div>

                {/* Centre — absolutely positioned so it stays fixed regardless of left/right widths */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-24">
                    <h1 className="text-base sm:text-lg font-semibold truncate">{reportTitle}</h1>
                </div>

                {/* Right */}
                <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                    {isSubmitted ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Submitted
                        </div>
                    ) : saveStatus === "saving" ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Saving…
                        </div>
                    ) : saveStatus === "saved" ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Saved
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Step drawer overlay */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 z-40 bg-black/20"
                            onClick={() => setDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border shadow-lg flex flex-col"
                        >
                            <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
                                <h2 className="text-lg font-semibold">Sections</h2>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <nav className="flex-1 overflow-y-auto py-2">
                                {sections.map((section, index) => (
                                    <button
                                        key={`${section.id}-${index}`}
                                        onClick={() => handleStepClick(index)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-left text-xs transition-colors",
                                            currentStep === index
                                                ? "bg-secondary font-semibold text-foreground"
                                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                                                currentStep === index
                                                    ? "bg-foreground text-background"
                                                    : "bg-secondary text-muted-foreground"
                                            )}
                                        >
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span className="flex-1 truncate">{section.title}</span>
                                        <StatusPill status={validations[index] ?? "empty"} />
                                    </button>
                                ))}
                            </nav>
                            {isSubmitted && (
                                <div className="border-t border-border p-3 shrink-0">
                                    <Link
                                        href={ROUTES.OPS_REPORTS}
                                        onClick={() => setDrawerOpen(false)}
                                        className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
                                    >
                                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                                        Return to Dashboard
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
