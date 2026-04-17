"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { IconLoader2 as LoaderIcon } from "@tabler/icons-react";
import type { TemplateSchema } from "@/lib/report-templates/types";
import { computeAllSectionValidations } from "@/lib/reports/validation";
import { ROUTES } from "@/lib/routes";
import { WizardTopBar } from "./WizardTopBar";
import { WizardStepContent } from "./WizardStepContent";

interface ReportWizardShellProps {
    reportId: string;
    reportTitle: string;
    reportStatus: string;
    schema: TemplateSchema;
    initialData: Record<string, unknown>;
    tenantId?: string;
    onSave: (data: Record<string, unknown>) => Promise<void>;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function ReportWizardShell({
    reportId,
    reportTitle,
    reportStatus,
    schema,
    initialData,
    tenantId,
    onSave,
    onSubmit,
}: ReportWizardShellProps) {
    const router = useRouter();
    const [data, setData] = useState<Record<string, unknown>>(initialData);
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(reportStatus);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dataRef = useRef(data);
    const hasUnsavedRef = useRef(false);
    dataRef.current = data;

    const isReadOnly = status === "submitted";

    // --- Debounced auto-save ---
    useEffect(() => {
        if (isReadOnly) return;
        hasUnsavedRef.current = true;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await onSave(dataRef.current);
                hasUnsavedRef.current = false;
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2000);
            } catch {
                setSaveStatus("idle");
            }
        }, 1500);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // --- Warn on unload ---
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (hasUnsavedRef.current) e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    // --- Save immediately (for navigation / submit) ---
    const saveNow = useCallback(async () => {
        if (isReadOnly || !hasUnsavedRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus("saving");
        try {
            await onSave(dataRef.current);
            hasUnsavedRef.current = false;
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
            setSaveStatus("idle");
        }
    }, [isReadOnly, onSave]);

    // --- Section data change ---
    const handleSectionChange = useCallback(
        (sectionId: string, sectionData: Record<string, unknown> | Record<string, unknown>[]) => {
            setData((prev) => ({ ...prev, [sectionId]: sectionData }));
        },
        []
    );

    // --- Navigation ---
    const goToStep = useCallback(
        (index: number) => {
            if (index === currentStep || index < 0 || index >= schema.sections.length) return;
            void saveNow();
            setDirection(index > currentStep ? 1 : -1);
            setCurrentStep(index);
        },
        [currentStep, schema.sections.length, saveNow]
    );

    const handlePrev = useCallback(() => goToStep(currentStep - 1), [currentStep, goToStep]);
    const handleNext = useCallback(() => goToStep(currentStep + 1), [currentStep, goToStep]);

    // --- Submit ---
    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        try {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            await onSubmit(dataRef.current);
            hasUnsavedRef.current = false;
            setStatus("submitted");
            toast.success("Report submitted");
            router.push(`${ROUTES.OPS_REPORTS}?report=${reportId}`);
        } catch {
            toast.error("Failed to submit report");
        } finally {
            setSubmitting(false);
        }
    }, [onSubmit, router, reportId]);

    // --- Validation ---
    const validations = useMemo(
        () => computeAllSectionValidations(schema, data),
        [schema, data]
    );

    if (!schema.sections[currentStep]) return null;

    return (
        <div className="h-screen flex flex-col bg-background">
            <WizardTopBar
                reportTitle={reportTitle}
                currentStep={currentStep}
                totalSteps={schema.sections.length}
                saveStatus={saveStatus}
                reportStatus={status}
                sections={schema.sections}
                validations={validations}
                onStepClick={goToStep}
            />

            <WizardStepContent
                schema={schema}
                data={data}
                currentIndex={currentStep}
                onChange={handleSectionChange}
                readOnly={isReadOnly}
                reportId={reportId}
                tenantId={tenantId}
                direction={direction}
                onPrev={handlePrev}
                onNext={handleNext}
                onSubmit={handleSubmit}
                submitting={submitting}
                reportStatus={status}
            />

            <AnimatePresence>
                {submitting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 shadow-lg"
                        >
                            <LoaderIcon className="w-6 h-6 text-primary animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-semibold">Submitting report…</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Finalising your report. This may take a moment.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
