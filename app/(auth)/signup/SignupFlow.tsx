"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconArrowRight as ArrowRightIcon,
    IconArrowLeft as ArrowLeftIcon,
    IconPlus as PlusIcon,
    IconTrash as TrashIcon,
    IconUpload as UploadIcon,
    IconBuilding as BuildingIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { tenantSignup } from "@/app/actions/tenantSignup";
import { inviteUser } from "@/app/actions/inviteUser";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export type ClientPlan = {
    id: string;
    name: string;
    monthly: { price_id: string; amount_cents: number };
    annual: { price_id: string; amount_cents: number };
};

type InviteRow = { email: string };

const inputClass =
    "h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white/40 transition-all rounded-lg";
const primaryBtnClass = "bg-white text-black hover:bg-white/90";
const ghostBtnClass = "text-white/50 hover:text-white hover:bg-white/5";
const labelClass = "text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]";
const stepEyebrowClass = "text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]";

export default function SignupFlow({ plans }: { plans: ClientPlan[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1 — Account
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Step 2 — Company
    const [companyName, setCompanyName] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Set once tenantSignup runs (or rehydrated from Stripe-return state).
    const [tenantId, setTenantId] = useState<string | null>(null);

    // Step 3 — Plan
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

    // Step 4 — Invites
    const [invites, setInvites] = useState<InviteRow[]>([{ email: "" }]);

    // Resume after a cancelled Stripe Checkout: ?step=plan&checkout=cancelled
    // brings the user back onto the plan step so they can retry. Successful
    // checkouts redirect straight to /dashboard from the checkout route.
    useEffect(() => {
        const stepParam = searchParams.get("step");
        const checkoutParam = searchParams.get("checkout");
        if (stepParam === "plan") {
            setStep(4);
            setTenantId("resumed"); // sentinel so plan cards aren't disabled
            if (checkoutParam === "cancelled") {
                toast.message("Checkout cancelled. Pick a plan to finish setting up.");
            }
            router.replace("/signup");
        }
        // We intentionally only run this on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- Validation ----
    const accountValid =
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        /\S+@\S+\.\S+/.test(email) &&
        password.length >= 8;

    const companyValid = companyName.trim().length >= 2;

    // ---- Handlers ----
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please pick an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Logo must be under 5MB.");
            return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const submitSignup = async () => {
        setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("company_name", companyName.trim());
            fd.append("first_name", firstName.trim());
            fd.append("last_name", lastName.trim());
            fd.append("email", email.trim());
            fd.append("password", password);
            const res = await tenantSignup(fd);
            if (!res.success) {
                toast.error(res.error);
                setIsSubmitting(false);
                return;
            }
            setTenantId(res.tenantId);

            if (logoFile) {
                try {
                    const supabase = createBrowserClient();
                    const ext = logoFile.name.split(".").pop() ?? "png";
                    const path = `${res.tenantId}/logo.${ext}`;
                    const { error: uploadErr } = await supabase.storage
                        .from("tenant-assets")
                        .upload(path, logoFile, { upsert: true });
                    if (uploadErr) throw uploadErr;
                    const { data: urlData } = supabase.storage
                        .from("tenant-assets")
                        .getPublicUrl(path);
                    await fetch("/api/tenant", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ logo_url: urlData.publicUrl }),
                    });
                } catch {
                    toast.message("Logo upload failed. You can add it later in Settings → Branding.");
                }
            }

            setStep(3);
        } catch {
            toast.error("Something went wrong creating your workspace.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitInvites = async () => {
        const validInvites = invites
            .map((i) => i.email.trim().toLowerCase())
            .filter((e) => /\S+@\S+\.\S+/.test(e));

        if (validInvites.length === 0) {
            setStep(4);
            return;
        }

        setIsSubmitting(true);
        let sent = 0;
        const failures: string[] = [];
        for (const inviteEmail of validInvites) {
            try {
                const res = await inviteUser(inviteEmail, "", "", "member");
                if (res.success) {
                    sent++;
                } else {
                    failures.push(`${inviteEmail}: ${res.error}`);
                }
            } catch {
                failures.push(`${inviteEmail}: failed to send`);
            }
        }
        setIsSubmitting(false);

        if (sent > 0) toast.success(`Sent ${sent} invitation${sent === 1 ? "" : "s"}.`);
        if (failures.length > 0) toast.error(failures[0]);

        setStep(4);
    };

    const startCheckout = async (priceId: string) => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price_id: priceId, from_signup: true }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.url) {
                toast.error(body?.error ?? "Couldn't start checkout.");
                setIsSubmitting(false);
                return;
            }
            window.location.assign(body.url);
        } catch {
            toast.error("Couldn't start checkout.");
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!accountValid) {
                if (password.length < 8) toast.error("Password must be at least 8 characters.");
                else toast.error("Please complete every field with a valid email.");
                return;
            }
            setStep(2);
            return;
        }
        if (step === 2) {
            if (!companyValid) {
                toast.error("Company name must be at least 2 characters.");
                return;
            }
            await submitSignup();
            return;
        }
        if (step === 3) {
            await submitInvites();
            return;
        }
    };

    const goBack = () => {
        if (step === 3 || step === 4) return;
        setStep((s) => Math.max(0, s - 1));
    };

    // ---- Render ----
    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden text-white">
            <header className="relative z-10 shrink-0 pt-10 pb-8 flex justify-center">
                <Logo variant="dark" width={220} />
            </header>

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-32">
                <div className="w-full flex justify-center">
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full max-w-lg text-center space-y-10"
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="h-px w-8 bg-white/15" />
                                        <p className={stepEyebrowClass}>Welcome to THOR</p>
                                        <span className="h-px w-8 bg-white/15" />
                                    </div>
                                    <h1 className="font-display text-5xl md:text-7xl font-semibold text-white leading-[0.95] tracking-tight">
                                        Built for teams<br />
                                        <span className="text-white/50">that build things.</span>
                                    </h1>
                                    <p className="text-base md:text-lg text-white/50 max-w-md mx-auto leading-relaxed">
                                        Quote, schedule, invoice, manage and grow without juggling six different tools.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Button
                                        size="lg"
                                        className={cn("h-12 px-8 text-base", primaryBtnClass)}
                                        onClick={() => setStep(1)}
                                    >
                                        Set up your workspace
                                        <ArrowRightIcon className="ml-2 w-4 h-4" />
                                    </Button>
                                    <p className="text-xs text-white/30">
                                        30-day free trial · Card not charged until day 30
                                    </p>
                                </div>

                                <p className="text-sm text-white/40">
                                    Already have an account?{" "}
                                    <Link href="/" className="text-white font-semibold hover:underline">
                                        Log in
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="account"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="w-full max-w-md space-y-8"
                            >
                                <div className="text-center space-y-3">
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Create your account
                                    </h2>
                                    <p className="text-white/50 text-base">
                                        You&apos;ll be the workspace owner.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className={labelClass}>First Name</label>
                                            <Input
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Jane"
                                                className={inputClass}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Last Name</label>
                                            <Input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Doe"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Email</label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@company.com"
                                            className={inputClass}
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Password</label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className={inputClass}
                                            autoComplete="new-password"
                                            onKeyDown={(e) => e.key === "Enter" && accountValid && handleNext()}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" onClick={goBack} className={ghostBtnClass}>
                                        <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={!accountValid}
                                        className={primaryBtnClass}
                                    >
                                        Continue <ArrowRightIcon className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
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
                                            onChange={handleLogoSelect}
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
                                            onKeyDown={(e) => e.key === "Enter" && companyValid && handleNext()}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={goBack}
                                        disabled={isSubmitting}
                                        className={ghostBtnClass}
                                    >
                                        <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={!companyValid || isSubmitting}
                                        className={primaryBtnClass}
                                    >
                                        {isSubmitting ? "Creating workspace..." : "Continue"}
                                        {!isSubmitting && <ArrowRightIcon className="ml-2 w-4 h-4" />}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="plan"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="w-full max-w-4xl space-y-8"
                            >
                                <div className="text-center space-y-3">
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Choose your plan
                                    </h2>
                                    <p className="text-white/50 text-base">
                                        Start with a 30-day free trial. No card charged until day 30.
                                    </p>
                                </div>

                                <div className="flex justify-center">
                                    <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
                                        {(["monthly", "annual"] as const).map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => setBillingCycle(opt)}
                                                className={cn(
                                                    "px-4 h-8 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors",
                                                    billingCycle === opt
                                                        ? "bg-white text-black"
                                                        : "text-white/50 hover:text-white",
                                                )}
                                            >
                                                {opt === "monthly" ? "Monthly" : "Annual · Save 17%"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {plans.map((plan) => {
                                        const cycleData =
                                            billingCycle === "annual" ? plan.annual : plan.monthly;
                                        const monthlyEq =
                                            billingCycle === "annual"
                                                ? Math.round(plan.annual.amount_cents / 12)
                                                : null;
                                        const highlight = plan.id === "iron_oak";
                                        return (
                                            <div
                                                key={plan.id}
                                                className={cn(
                                                    "relative rounded-2xl border p-7 flex flex-col transition-colors",
                                                    highlight
                                                        ? "border-white bg-white/[0.06]"
                                                        : "border-white/10 bg-white/[0.02] hover:border-white/20",
                                                )}
                                            >
                                                {highlight && (
                                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black rounded-md">
                                                            Most popular
                                                        </span>
                                                    </div>
                                                )}

                                                <h3 className="font-display text-2xl text-white">{plan.name}</h3>

                                                <div className="mt-6">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-4xl font-display font-semibold text-white">
                                                            {formatCurrency(cycleData.amount_cents / 100).replace(/\.00$/, "")}
                                                        </span>
                                                        <span className="text-sm text-white/40">
                                                            / seat / {billingCycle === "annual" ? "yr" : "mo"}
                                                        </span>
                                                    </div>
                                                    {monthlyEq != null && (
                                                        <p className="text-xs text-white/30 mt-1">
                                                            ≈ {formatCurrency(monthlyEq / 100).replace(/\.00$/, "")} / seat / mo
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-7 pt-6 border-t border-white/10">
                                                    <Button
                                                        size="lg"
                                                        className={cn(
                                                            "w-full",
                                                            highlight
                                                                ? "bg-white text-black hover:bg-white/90"
                                                                : "bg-white/10 text-white border border-white/15 hover:bg-white/20",
                                                        )}
                                                        disabled={isSubmitting || !tenantId}
                                                        onClick={() => startCheckout(cycleData.price_id)}
                                                    >
                                                        {isSubmitting ? "Starting..." : "Start 30-day trial"}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <p className="text-center text-xs text-white/30">
                                    You&apos;ll be redirected to Stripe to enter payment details.
                                </p>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="invite"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="w-full max-w-md space-y-8"
                            >
                                <div className="text-center space-y-3">
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                        Invite your team
                                    </h2>
                                    <p className="text-white/50 text-base">
                                        Add who you want to bring on board. We&apos;ll size your subscription to match in the next step.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {invites.map((row, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Input
                                                type="email"
                                                value={row.email}
                                                onChange={(e) => {
                                                    const next = [...invites];
                                                    next[idx] = { email: e.target.value };
                                                    setInvites(next);
                                                }}
                                                placeholder="teammate@company.com"
                                                className={inputClass}
                                                autoFocus={idx === 0}
                                            />
                                            {invites.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setInvites(invites.filter((_, i) => i !== idx))
                                                    }
                                                    className="text-white/30 hover:text-white/70 transition-colors p-2"
                                                    aria-label="Remove invite"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setInvites([...invites, { email: "" }])}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add another
                                    </button>
                                </div>

                                <p className="text-xs text-white/30 text-center">
                                    Everyone joins as <span className="text-white/60">Member</span>. You can change roles later in Settings → Users.
                                </p>

                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(4)}
                                        disabled={isSubmitting}
                                        className={ghostBtnClass}
                                    >
                                        Skip for now
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        disabled={isSubmitting}
                                        className={primaryBtnClass}
                                    >
                                        {isSubmitting ? "Sending..." : "Send invites"}
                                        {!isSubmitting && <ArrowRightIcon className="ml-2 w-4 h-4" />}
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


