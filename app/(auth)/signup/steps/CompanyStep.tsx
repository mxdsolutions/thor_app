"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
    IconArrowRight as ArrowRightIcon,
    IconArrowLeft as ArrowLeftIcon,
    IconUpload as UploadIcon,
    IconBuilding as BuildingIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { inputClass, primaryBtnClass, ghostBtnClass, labelClass } from "./styles";

interface Props {
    companyName: string;
    setCompanyName: (v: string) => void;
    logoFile: File | null;
    setLogoFile: (f: File | null) => void;
    logoPreview: string | null;
    setLogoPreview: (v: string | null) => void;
    onLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    companyValid: boolean;
    isSubmitting: boolean;
    onNext: () => void;
    onBack: () => void;
}

export function CompanyStep({
    companyName, setCompanyName,
    logoPreview, setLogoFile, setLogoPreview,
    onLogoSelect, companyValid, isSubmitting, onNext, onBack,
}: Props) {
    const logoInputRef = useRef<HTMLInputElement>(null);

    return (
        <motion.div
            key="company"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md space-y-8"
        >
            <div className="text-center space-y-3">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Set up your company
                </h2>
                <p className="text-white/50 text-base">
                    These appear across your workspace. You can change them any time.
                </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-7">
                <div className="flex flex-col items-center text-center space-y-4">
                    <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className={cn(
                            "relative group w-28 h-28 rounded-2xl overflow-hidden transition-all cursor-pointer flex items-center justify-center",
                            logoPreview
                                ? "border border-white/15 bg-white"
                                : "border-2 border-dashed border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]",
                        )}
                    >
                        {logoPreview ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded preview */}
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    className="max-w-full max-h-full object-contain p-3"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <UploadIcon className="w-6 h-6 text-white" />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-1.5 text-white/40 group-hover:text-white/70 transition-colors">
                                <BuildingIcon className="w-7 h-7" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Add logo</span>
                            </div>
                        )}
                    </button>
                    <div className="space-y-1">
                        <p className="text-xs text-white/40">PNG, JPG, SVG · max 5MB · optional</p>
                        {logoPreview && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLogoFile(null);
                                    setLogoPreview(null);
                                    if (logoInputRef.current) logoInputRef.current.value = "";
                                }}
                                className="text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                                Remove logo
                            </button>
                        )}
                    </div>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={onLogoSelect}
                        className="hidden"
                    />
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-2">
                    <label className={labelClass}>Company Name</label>
                    <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Engineering"
                        className={inputClass}
                        onKeyDown={(e) => e.key === "Enter" && companyValid && onNext()}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} disabled={isSubmitting} className={ghostBtnClass}>
                    <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button size="lg" onClick={onNext} disabled={!companyValid || isSubmitting} className={primaryBtnClass}>
                    {isSubmitting ? "Creating workspace..." : "Continue"}
                    {!isSubmitting && <ArrowRightIcon className="ml-2 w-4 h-4" />}
                </Button>
            </div>
        </motion.div>
    );
}
