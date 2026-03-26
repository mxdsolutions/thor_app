"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { updatePassword } from "@/app/actions/auth";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
        first_name: "",
        last_name: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 2;

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleNext = async () => {
        if (step === 1) {
            // Validate & set password
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
            setIsSubmitting(true);
            const data = new FormData();
            data.append("first_name", formData.first_name.trim());
            data.append("last_name", formData.last_name.trim());
            try {
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
        (step === 1 && (formData.password.length < 8 || formData.password !== formData.confirmPassword)) ||
        (step === 2 && (!formData.first_name.trim() || !formData.last_name.trim()));

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden text-white">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 z-50">
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
                                        Let's get you set up.
                                    </h1>
                                    <p className="text-lg text-slate-400 max-w-md mx-auto leading-relaxed">
                                        Just two quick steps to secure your account and personalize your experience.
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    className="h-14 px-10 text-lg rounded-full"
                                    onClick={() => setStep(1)}
                                >
                                    Get Started <ArrowRight className="ml-2 w-5 h-5" />
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
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">Step 1 of 2</p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Secure your account
                                    </h2>
                                    <p className="text-slate-400 text-lg">
                                        Set a strong password for your new account.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                            New Password
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="At least 8 characters"
                                            value={formData.password}
                                            onChange={(e) => updateField("password", e.target.value)}
                                            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                            Confirm Password
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="Repeat your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => updateField("confirmPassword", e.target.value)}
                                            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl"
                                            onKeyDown={(e) => e.key === "Enter" && !nextDisabled && handleNext()}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(0)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={nextDisabled}
                                        className="rounded-full px-8"
                                    >
                                        {isSubmitting ? "Saving..." : "Continue"}
                                        {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
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
                                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">Step 2 of 2</p>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        What's your name?
                                    </h2>
                                    <p className="text-slate-400 text-lg">
                                        We'll use this to personalize your experience.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                            First Name
                                        </label>
                                        <Input
                                            placeholder="Jane"
                                            value={formData.first_name}
                                            onChange={(e) => updateField("first_name", e.target.value)}
                                            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                            Last Name
                                        </label>
                                        <Input
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={(e) => updateField("last_name", e.target.value)}
                                            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:bg-white/10 transition-all rounded-2xl"
                                            onKeyDown={(e) => e.key === "Enter" && !nextDisabled && handleNext()}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(1)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={nextDisabled}
                                        className="rounded-full px-8"
                                    >
                                        {isSubmitting ? "Setting up..." : "Go to Dashboard"}
                                        {!isSubmitting && <Check className="ml-2 w-4 h-4" />}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Background blobs */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        </div>
    );
}
