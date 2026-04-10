"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WizardStepContent } from "@/components/reports/wizard/WizardStepContent";
import type { SectionDef, TemplateSchema } from "@/lib/report-templates/types";
import { IconEye as EyeIcon, IconDeviceDesktop as ComputerDesktopIcon, IconDeviceTablet as DeviceTabletIcon, IconDeviceMobile as DevicePhoneMobileIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICES: { id: PreviewDevice; icon: typeof ComputerDesktopIcon; label: string; width: string; height?: string }[] = [
    { id: "desktop", icon: ComputerDesktopIcon, label: "Desktop", width: "max-w-full" },
    { id: "tablet", icon: DeviceTabletIcon, label: "Tablet", width: "max-w-[768px]", height: "h-[1024px]" },
    { id: "mobile", icon: DevicePhoneMobileIcon, label: "Mobile", width: "max-w-[375px]", height: "h-[812px]" },
];

const noop = () => {};

interface BuilderPreviewCanvasProps {
    section: SectionDef | null;
    selectedIndex: number | null;
    schema: TemplateSchema;
}

export function BuilderPreviewCanvas({ section, selectedIndex, schema }: BuilderPreviewCanvasProps) {
    const [device, setDevice] = useState<PreviewDevice>("desktop");
    const hasContent = section && section.fields.length > 0;

    const activeDevice = DEVICES.find((d) => d.id === device)!;

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Device toggle toolbar */}
            <div className="shrink-0 flex items-center justify-center py-2.5 border-b border-border bg-background">
                <div className="flex items-center gap-0.5 rounded-xl bg-secondary/60 p-0.5">
                    {DEVICES.map((d) => (
                        <button
                            key={d.id}
                            onClick={() => setDevice(d.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                                device === d.id
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <d.icon className="w-3.5 h-3.5" />
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-y-auto bg-muted/30">
                {hasContent && schema ? (
                    <div className={cn(
                        "flex justify-center px-4",
                        device === "desktop" ? "min-h-full" : "py-6 lg:py-8"
                    )}>
                        <motion.div
                            layout
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className={cn(
                                "w-full flex flex-col",
                                activeDevice.width,
                                activeDevice.height,
                                device === "desktop" && "flex-1"
                            )}
                        >
                            {/* Device frame */}
                            <div className={cn(
                                "flex flex-col rounded-2xl border-2 border-zinc-300 bg-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden",
                                device === "desktop" ? "flex-1" : "h-full",
                                device === "mobile" && "rounded-[2rem] border-[2.5px]"
                            )}>
                                {/* Top bezel */}
                                <div className="flex items-center justify-center py-1.5 bg-zinc-300 shrink-0">
                                    <div
                                        className={cn(
                                            "bg-zinc-400/60 rounded-full",
                                            device === "mobile" ? "w-14 h-3" : "w-1.5 h-1.5"
                                        )}
                                    />
                                </div>

                                {/* Screen — renders the actual WizardStepContent */}
                                <div className="flex-1 flex flex-col bg-background overflow-hidden">
                                    <WizardStepContent
                                        schema={schema}
                                        data={{}}
                                        currentIndex={selectedIndex ?? 0}
                                        onChange={noop}
                                        readOnly
                                        reportId=""
                                        direction={1}
                                        onPrev={noop}
                                        onNext={noop}
                                        onSubmit={noop}
                                        submitting={false}
                                        reportStatus="draft"
                                    />
                                </div>

                                {/* Bottom bezel */}
                                <div className="flex items-center justify-center py-1.5 bg-zinc-300 shrink-0">
                                    <div className="w-16 h-0.5 bg-zinc-400/60 rounded-full" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full text-muted-foreground"
                        >
                            <EyeIcon className="w-8 h-8 mb-3 text-muted-foreground/40" />
                            <p className="text-sm font-medium">Preview</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                {section ? "Add fields to see a live preview" : "Select a section to preview"}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
