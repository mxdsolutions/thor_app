"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { tenantSignup } from "@/app/actions/tenantSignup";
import { inviteUser } from "@/app/actions/inviteUser";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import { WelcomeStep } from "./steps/WelcomeStep";
import { AccountStep } from "./steps/AccountStep";
import { CompanyStep } from "./steps/CompanyStep";
import { InvitesStep } from "./steps/InvitesStep";
import { PlanStep } from "./steps/PlanStep";

export type ClientPlan = {
    id: string;
    name: string;
    monthly: { price_id: string; amount_cents: number };
    annual: { price_id: string; amount_cents: number };
};

type InviteRow = { email: string };

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

    // Set once tenantSignup runs (or rehydrated from Stripe-return state).
    const [tenantId, setTenantId] = useState<string | null>(null);

    // Step 4 — Plan
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

    // Step 3 — Invites
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

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden text-white">
            <header className="relative z-10 shrink-0 pt-10 pb-8 flex justify-center">
                <Logo variant="dark" width={220} />
            </header>

            <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-32">
                <div className="w-full flex justify-center">
                    <AnimatePresence mode="wait">
                        {step === 0 && <WelcomeStep onStart={() => setStep(1)} />}

                        {step === 1 && (
                            <AccountStep
                                firstName={firstName}
                                setFirstName={setFirstName}
                                lastName={lastName}
                                setLastName={setLastName}
                                email={email}
                                setEmail={setEmail}
                                password={password}
                                setPassword={setPassword}
                                accountValid={accountValid}
                                onNext={handleNext}
                                onBack={goBack}
                            />
                        )}

                        {step === 2 && (
                            <CompanyStep
                                companyName={companyName}
                                setCompanyName={setCompanyName}
                                logoFile={logoFile}
                                setLogoFile={setLogoFile}
                                logoPreview={logoPreview}
                                setLogoPreview={setLogoPreview}
                                onLogoSelect={handleLogoSelect}
                                companyValid={companyValid}
                                isSubmitting={isSubmitting}
                                onNext={handleNext}
                                onBack={goBack}
                            />
                        )}

                        {step === 3 && (
                            <InvitesStep
                                invites={invites}
                                setInvites={setInvites}
                                isSubmitting={isSubmitting}
                                onSubmit={handleNext}
                                onSkip={() => setStep(4)}
                            />
                        )}

                        {step === 4 && (
                            <PlanStep
                                plans={plans}
                                billingCycle={billingCycle}
                                setBillingCycle={setBillingCycle}
                                isSubmitting={isSubmitting}
                                tenantId={tenantId}
                                onCheckout={startCheckout}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
