"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Camera, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/app/actions/onboarding";
import { updatePassword } from "@/app/actions/auth";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOTAL_STEPS = 3;

// Same dark-surface tokens used in the signup flow — keeps the two onboarding
// experiences (new tenant signup vs. invitee onboarding) visually consistent.
const inputClass =
    "h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white/40 transition-all rounded-lg";
const primaryBtnClass = "bg-white text-foreground hover:bg-white/90";
const ghostBtnClass = "text-white/50 hover:text-white hover:bg-white/5";
const labelClass =
    "text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em]";
const eyebrowClass =
    "text-[11px] font-semibold text-white/40 uppercase tracking-[0.2em]";
const stepHeadingClass =
    "font-display text-3xl md:text-4xl tracking-tight text-white";
const subheadingClass = "text-sm md:text-base text-white/55";

/** Brand wordmark — Paladins-Condensed THOR with a sans-serif ™ superscript.
 *  Matches the pattern used in the dashboard mobile drawer. */
function ThorWordmark({ size = 44 }: { size?: number }) {
    return (
        <span
            style={{ fontSize: size, lineHeight: 1 }}
            className="font-paladins tracking-[0.08em] text-white inline-flex items-start"
        >
            THOR
            <span
                className="font-sans text-[0.45em] font-semibold ml-[0.18em] mt-[0.15em] align-super text-white/60"
            >
                ™
            </span>
        </span>
    );
}

export default function OnboardingFlow() {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
        first_name: "",
        last_name: "",
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB.");
            return;
        }

        setAvatarFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleNext = async () => {
        if (step === 1) {
            if (formData.password.length < 8) {
                toast.error("Password must be at least 8 characters.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error("Passwords do not match.");
                return;
            }
            setIsSubmitting(true);
            const data = new FormData();
            data.append("password", formData.password);
            const res = await updatePassword(data);
            setIsSubmitting(false);
            if (res.error) {
                toast.error(res.error);
                return;
            }
        }

        if (step === 2) {
            if (!formData.first_name.trim() || !formData.last_name.trim()) {
                toast.error("Please enter your first and last name.");
                return;
            }
        }

        if (step === 3) {
            setIsSubmitting(true);
            try {
                let avatarUrl: string | null = null;

                if (avatarFile) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const ext = avatarFile.name.split(".").pop();
                        const path = `${user.id}/avatar.${ext}`;

                        const { error: uploadError } = await supabase.storage
                            .from("avatars")
                            .upload(path, avatarFile, { upsert: true });

                        if (uploadError) {
                            toast.error("Failed to upload avatar. Continuing without it.");
                        } else {
                            const { data: urlData } = supabase.storage
                                .from("avatars")
                                .getPublicUrl(path);
                            avatarUrl = urlData.publicUrl;
                        }
                    }
                }

                const data = new FormData();
                data.append("first_name", formData.first_name.trim());
                data.append("last_name", formData.last_name.trim());
                if (avatarUrl) data.append("avatar_url", avatarUrl);

                const res = await completeOnboarding(data);
                if (res?.error) {
                    toast.error(res.error);
                    setIsSubmitting(false);
                }
            } catch {
                toast.error("Something went wrong. Please try again.");
                setIsSubmitting(false);
            }
            return;
        }

        setStep((s) => s + 1);
    };

    const nextDisabled =
        isSubmitting ||
        (step === 1 &&
            (formData.password.length < 8 ||
                formData.password !== formData.confirmPassword)) ||
        (step === 2 &&
            (!formData.first_name.trim() || !formData.last_name.trim()));

    return (
        <div className="min-h-screen bg-foreground flex flex-col text-white">
            <header className="pt-12 pb-8 px-6">
                <div className="max-w-md mx-auto flex flex-col items-center gap-6">
                    <ThorWordmark size={44} />
                    {step > 0 && (
                        <div className="flex items-center gap-2" aria-label="Onboarding progress">
                            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        "h-1 w-10 rounded-full transition-colors",
                                        i <= step ? "bg-white" : "bg-white/10",
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 flex items-start justify-center px-6 pb-16">
                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="text-center space-y-8 pt-6"
                            >
                                <div className="space-y-3">
                                    <p className={eyebrowClass}>Welcome aboard</p>
                                    <h1 className="font-display text-4xl md:text-5xl tracking-tight text-white">
                                        Let&apos;s get you set up.
                                    </h1>
                                    <p className="text-white/55 max-w-sm mx-auto leading-relaxed">
                                        Three quick steps to secure your account and
                                        personalise your profile.
                                    </p>
                                </div>
                                <Button size="lg" onClick={() => setStep(1)} className={primaryBtnClass}>
                                    Get started
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <p className={eyebrowClass}>Step 1 of 3</p>
                                    <h2 className={stepHeadingClass}>Secure your account</h2>
                                    <p className={subheadingClass}>
                                        Set a strong password for your new account.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={labelClass}>New password</label>
                                        <Input
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={formData.password}
                                            onChange={(e) => updateField("password", e.target.value)}
                                            data-no-focus-style
                                            className={inputClass}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Confirm password</label>
                                        <Input
                                            type="password"
                                            placeholder="Repeat your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => updateField("confirmPassword", e.target.value)}
                                            data-no-focus-style
                                            className={inputClass}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" && !nextDisabled && handleNext()
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" onClick={() => setStep(0)} className={ghostBtnClass}>
                                        <ArrowLeft className="mr-2 w-4 h-4" />
                                        Back
                                    </Button>
                                    <Button onClick={handleNext} disabled={nextDisabled} className={primaryBtnClass}>
                                        {isSubmitting ? "Saving…" : (
                                            <>
                                                Continue
                                                <ArrowRight className="ml-2 w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <p className={eyebrowClass}>Step 2 of 3</p>
                                    <h2 className={stepHeadingClass}>What&apos;s your name?</h2>
                                    <p className={subheadingClass}>
                                        We&apos;ll use this to personalise your experience.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className={labelClass}>First name</label>
                                        <Input
                                            placeholder="Jane"
                                            value={formData.first_name}
                                            onChange={(e) => updateField("first_name", e.target.value)}
                                            data-no-focus-style
                                            className={inputClass}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Last name</label>
                                        <Input
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={(e) => updateField("last_name", e.target.value)}
                                            data-no-focus-style
                                            className={inputClass}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" && !nextDisabled && handleNext()
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" onClick={() => setStep(1)} className={ghostBtnClass}>
                                        <ArrowLeft className="mr-2 w-4 h-4" />
                                        Back
                                    </Button>
                                    <Button onClick={handleNext} disabled={nextDisabled} className={primaryBtnClass}>
                                        Continue
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="avatar"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <p className={eyebrowClass}>Step 3 of 3</p>
                                    <h2 className={stepHeadingClass}>Add a profile picture</h2>
                                    <p className={subheadingClass}>
                                        Help your team recognise you. You can skip this for now.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "relative group w-32 h-32 rounded-full overflow-hidden",
                                            "border-2 border-dashed border-white/15 bg-white/[0.04]",
                                            "hover:border-white/40 hover:bg-white/[0.06] transition-colors",
                                            "flex items-center justify-center",
                                        )}
                                    >
                                        {avatarPreview ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar preview, dimensions unknown */}
                                                <img
                                                    src={avatarPreview}
                                                    alt="Avatar preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-7 h-7 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 text-white/40 group-hover:text-white/60 transition-colors">
                                                <UserCircle className="w-12 h-12" strokeWidth={1.5} />
                                                <span className="text-xs font-medium">Upload</span>
                                            </div>
                                        )}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarSelect}
                                        className="hidden"
                                    />
                                    {avatarPreview && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAvatarFile(null);
                                                setAvatarPreview(null);
                                            }}
                                            className="text-sm text-white/40 hover:text-white/70 transition-colors"
                                        >
                                            Remove photo
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" onClick={() => setStep(2)} className={ghostBtnClass}>
                                        <ArrowLeft className="mr-2 w-4 h-4" />
                                        Back
                                    </Button>
                                    <Button onClick={handleNext} disabled={isSubmitting} className={primaryBtnClass}>
                                        {isSubmitting ? "Setting up…" : (
                                            <>
                                                Complete setup
                                                <Check className="ml-2 w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
