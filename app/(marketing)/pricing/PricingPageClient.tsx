"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SlateHero } from "@/components/marketing/SlateHero";
import { SectionMarker } from "@/components/marketing/SectionMarker";
import { PricingCard } from "@/components/marketing/PricingCard";
import { Perforation } from "@/components/marketing/Perforation";
import { BrandStamp } from "@/components/marketing/BrandStamp";
import { PUBLIC_PLANS, type BillingCycle } from "@/lib/plans-public";

const FAQS = [
    {
        q: "How does the free trial work?",
        a: "You get thirty days of full access to whichever plan you pick. We don't charge your card until day thirty — you can cancel anytime before then with no fee.",
    },
    {
        q: "What counts as a seat?",
        a: "One seat = one active user logging into THOR. You're billed for the number of active users on your tenant. You can add or remove seats from Settings → Users at any time.",
    },
    {
        q: "Can I change plans later?",
        a: "Yes. Upgrade or downgrade from Settings → Subscription whenever you like. Plan changes take effect at the start of the next billing period.",
    },
    {
        q: "What happens if I cancel?",
        a: "Your workspace stays active until the end of your current billing period — you keep full access until then. After that, you're moved to read-only and can re-subscribe anytime to restore write access.",
    },
    {
        q: "Do you offer annual discounts?",
        a: "Yes. Paying annually saves you about 17% compared to monthly billing on the same plan.",
    },
    {
        q: "Where is my data stored?",
        a: "Postgres on Supabase, hosted in Sydney (ap-southeast-2). Files are stored in S3-compatible object storage in the same region.",
    },
];

const COMPARISON = [
    { feature: "Unlimited jobs, contacts, and projects", iron_ore: true, iron_oak: true, forged: true },
    { feature: "Quotes, invoices, and receipts", iron_ore: true, iron_oak: true, forged: true },
    { feature: "Mobile timesheets", iron_ore: true, iron_oak: true, forged: true },
    { feature: "File storage", iron_ore: "5 GB / seat", iron_oak: "20 GB / seat", forged: "Unlimited" },
    { feature: "Scheduling & team assignments", iron_ore: false, iron_oak: true, forged: true },
    { feature: "Site reports with photos", iron_ore: false, iron_oak: true, forged: true },
    { feature: "Purchase orders & pricing books", iron_ore: false, iron_oak: true, forged: true },
    { feature: "Xero integration", iron_ore: false, iron_oak: true, forged: true },
    { feature: "Custom report templates", iron_ore: false, iron_oak: false, forged: true },
    { feature: "Outlook email integration", iron_ore: false, iron_oak: false, forged: true },
    { feature: "Custom domain", iron_ore: false, iron_oak: false, forged: true },
    { feature: "Advanced analytics", iron_ore: false, iron_oak: false, forged: true },
    { feature: "Support", iron_ore: "Email", iron_oak: "Priority email", forged: "Dedicated onboarding" },
];

export function PricingPageClient() {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");

    return (
        <>
            {/* HERO */}
            <SlateHero size="compact">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-10 sm:mb-14 lg:mb-20">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            Pricing
                        </p>
                        <p className="hidden sm:block font-statement italic text-[13px] text-white/40">
                            Vol. I — Doc. 03 · Three tiers
                        </p>
                    </div>
                    <BrandStamp serial="0204" edition="VOL.I — DOC.03" surface="dark" className="self-start sm:self-auto" />
                </div>
                <div className="max-w-5xl">
                    <h1 className="font-statement text-[44px] sm:text-[64px] md:text-[96px] lg:text-[128px] font-bold tracking-[-0.03em] leading-[0.95] sm:leading-[0.92] text-white text-balance">
                        Per seat. <span className="italic font-medium text-white/75">No surprises.</span>
                    </h1>
                    <p className="mt-8 sm:mt-10 text-base sm:text-lg md:text-xl text-white/55 max-w-2xl leading-[1.55]">
                        All plans include unlimited jobs, contacts, and projects. Pay per active user. Switch plans or cancel anytime.
                    </p>
                </div>
            </SlateHero>

            {/* TIER CARDS */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 lg:pt-28 pb-20 lg:pb-28">
                    <div className="flex flex-col items-center mb-12 lg:mb-14 gap-6">
                        <SectionMarker mark="I." label="Choose a plan" className="justify-center" />
                        <SegmentedControl<BillingCycle>
                            value={cycle}
                            onChange={setCycle}
                            options={[
                                { value: "monthly", label: "Monthly" },
                                { value: "annual", label: "Annual · save 17%" },
                            ]}
                            size="md"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {PUBLIC_PLANS.map((plan) => (
                            <PricingCard key={plan.id} plan={plan} cycle={cycle} />
                        ))}
                    </div>
                </div>
            </section>

            <Perforation />

            {/* COMPARISON TABLE */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-2xl mb-14">
                        <SectionMarker mark="II." label="Compare plans" />
                        <h2 className="mt-6 font-statement text-[34px] sm:text-4xl md:text-5xl font-bold tracking-[-0.024em] leading-[1.02]">
                            What&apos;s included.
                        </h2>
                    </div>

                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                                <tr className="border-b border-foreground/40">
                                    <th className="text-left py-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Feature</th>
                                    {PUBLIC_PLANS.map((p) => (
                                        <th key={p.id} className="text-center py-5 px-2 min-w-[120px]">
                                            <p className="font-statement text-base font-semibold tracking-tight text-foreground">
                                                {p.name}
                                            </p>
                                            {p.highlight && (
                                                <span className="block mt-1 font-statement italic text-[12px] text-muted-foreground">— Recommended</span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map((row) => (
                                    <tr key={row.feature} className="border-b border-border">
                                        <td className="py-4 text-[14px] text-foreground/85">{row.feature}</td>
                                        {(["iron_ore", "iron_oak", "forged"] as const).map((tier) => {
                                            const v = row[tier];
                                            return (
                                                <td key={tier} className="text-center py-4 px-2">
                                                    {v === true ? (
                                                        <Check className="w-4 h-4 inline text-foreground" strokeWidth={2.25} />
                                                    ) : v === false ? (
                                                        <span className="text-muted-foreground/35">—</span>
                                                    ) : (
                                                        <span className="text-[13px] text-foreground/85">{v}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* FAQ */}
            <section className="bg-secondary/40 bg-grain">
                <div className="mx-auto max-w-3xl px-6 lg:px-10 py-16 sm:py-20 lg:py-28">
                    <SectionMarker mark="III." label="FAQ" className="justify-center mx-auto" />
                    <h2 className="mt-6 mb-14 font-statement text-[34px] sm:text-4xl md:text-5xl font-bold tracking-[-0.024em] leading-[1.02] text-center">
                        Frequently asked.
                    </h2>
                    <dl className="space-y-12">
                        {FAQS.map((faq) => (
                            <div key={faq.q}>
                                <dt className="font-statement text-xl font-semibold text-foreground tracking-tight">{faq.q}</dt>
                                <dd className="mt-3 text-base text-muted-foreground leading-[1.65]">{faq.a}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-black text-white relative overflow-hidden">
                <div
                    aria-hidden
                    className="absolute -top-48 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full opacity-50 blur-[120px]"
                    style={{ background: "radial-gradient(closest-side, hsla(16,87%,55%,0.15), hsla(16,87%,55%,0) 70%)" }}
                />
                <div className="relative mx-auto max-w-5xl px-6 lg:px-10 py-28 lg:py-32 text-center">
                    <h2 className="font-statement text-[40px] sm:text-5xl md:text-6xl font-bold tracking-[-0.025em] leading-[1.02] max-w-3xl mx-auto text-balance">
                        Try every plan, <span className="italic font-medium text-white/55">free for thirty days</span>.
                    </h2>
                    <p className="mt-7 text-base md:text-lg text-white/50 max-w-xl mx-auto italic font-statement">
                        No card required. Cancel anytime.
                    </p>
                    <div className="mt-10 flex justify-center">
                        <Button asChild className="h-11 px-7 rounded-md text-[14px] font-medium bg-white text-foreground hover:bg-white/90">
                            <Link href="/signup">
                                Begin trial
                                <ArrowRight className="ml-2 w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
