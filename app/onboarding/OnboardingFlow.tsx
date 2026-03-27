"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRightIcon,
    ArrowLeftIcon,
    CheckIcon,
    CameraIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import { completeOnboarding } from "@/app/actions/onboarding";
import { updatePassword } from "@/app/actions/auth";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const totalSteps = 3;

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
        // Step 1: Set password
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

        // Step 2: Name — just validate, save on final step
        if (step === 2) {
            if (!formData.first_name.trim() || !formData.last_name.trim()) {
                toast.error("Please enter your first and last name.");
                return;
            }
        }

        // Step 3: Avatar + complete
        if (step === 3) {
            setIsSubmitting(true);
            try {
                let avatarUrl: string | null = null;

                // Upload avatar if selected
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
                if (avatarUrl) {
                    data.append("avatar_url", avatarUrl);
                }

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

    const inputClass =
        "h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl";

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden text-white">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50">
                {step > 0 && (
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                )}
            </div>

            {/* Logo top-left */}
            <div className="absolute top-6 left-6 z-10">
                <Logo variant="dark" />
            </div>

            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-lg">
                    <AnimatePresence mode="wait">
                        {/* Step 0: Welcome */}
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center space-y-8"
                            >
                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                                        Welcome aboard
                                    </p>
                                    <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                                        Let&apos;s get you set up.
                                    </h1>
                                    <p className="text-lg text-white/50 max-w-md mx-auto leading-relaxed">
                                        Three quick steps to secure your account and
                                        personalize your experience.
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    className="h-14 px-10 text-lg rounded-full"
                                    onClick={() => setStep(1)}
                                >
                                    Get Started{" "}
                                    <ArrowRightIcon className="ml-2 w-5 h-5" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 1: Set password */}
                        {step === 1 && (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="space-y-10"
                            >
                                <div className="text-center space-y-3">
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                                        Step 1 of 3
                                    </p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Secure your account
                                    </h2>
                                    <p className="text-white/50 text-lg">
                                        Set a strong password for your new account.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                                            New Password
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={formData.password}
                                            onChange={(e) =>
                                                updateField("password", e.target.value)
                                            }
                                            className={inputClass}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                                            Confirm Password
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="Repeat your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) =>
                                                updateField("confirmPassword", e.target.value)
                                            }
                                            className={inputClass}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                !nextDisabled &&
                                                handleNext()
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(0)}
                                        className="text-white/40 hover:text-white"
                                    >
                                        <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={nextDisabled}
                                        className="rounded-full px-8"
                                    >
                                        {isSubmitting ? "Saving..." : "Continue"}
                                        {!isSubmitting && (
                                            <ArrowRightIcon className="ml-2 w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Name */}
                        {step === 2 && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="space-y-10"
                            >
                                <div className="text-center space-y-3">
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                                        Step 2 of 3
                                    </p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        What&apos;s your name?
                                    </h2>
                                    <p className="text-white/50 text-lg">
                                        We&apos;ll use this to personalize your experience.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                                            First Name
                                        </label>
                                        <Input
                                            placeholder="Jane"
                                            value={formData.first_name}
                                            onChange={(e) =>
                                                updateField("first_name", e.target.value)
                                            }
                                            className={inputClass}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                                            Last Name
                                        </label>
                                        <Input
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={(e) =>
                                                updateField("last_name", e.target.value)
                                            }
                                            className={inputClass}
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                !nextDisabled &&
                                                handleNext()
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(1)}
                                        className="text-white/40 hover:text-white"
                                    >
                                        <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={nextDisabled}
                                        className="rounded-full px-8"
                                    >
                                        Continue
                                        <ArrowRightIcon className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Profile Picture */}
                        {step === 3 && (
                            <motion.div
                                key="avatar"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="space-y-10"
                            >
                                <div className="text-center space-y-3">
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                                        Step 3 of 3
                                    </p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Add a profile picture
                                    </h2>
                                    <p className="text-white/50 text-lg">
                                        Help your team recognize you. You can skip this
                                        for now.
                                    </p>
                                </div>

                                <div className="flex flex-col items-center space-y-6">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative group w-36 h-36 rounded-full overflow-hidden border-2 border-dashed border-white/20 hover:border-primary/50 transition-all cursor-pointer bg-white/5 flex items-center justify-center"
                                    >
                                        {avatarPreview ? (
                                            <>
                                                <img
                                                    src={avatarPreview}
                                                    alt="Avatar preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <CameraIcon className="w-8 h-8 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center space-y-2 text-white/30 group-hover:text-white/50 transition-colors">
                                                <UserCircleIcon className="w-16 h-16" />
                                                <span className="text-xs font-medium">
                                                    Upload
                                                </span>
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
                                            className="text-sm text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            Remove photo
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(2)}
                                        className="text-white/40 hover:text-white"
                                    >
                                        <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={isSubmitting}
                                        className="rounded-full px-8"
                                    >
                                        {isSubmitting
                                            ? "Setting up..."
                                            : "Complete Setup"}
                                        {!isSubmitting && (
                                            <CheckIcon className="ml-2 w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Background gradient glow */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(240,90,40,0.08),transparent_50%)] pointer-events-none" />
        </div>
    );
}
