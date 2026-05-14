import Link from "next/link";
import type { Metadata } from "next";
import {
    ArrowRight,
    Briefcase,
    Calendar,
    FileText,
    Users,
    Camera,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlateHero } from "@/components/marketing/SlateHero";
import { SectionMarker } from "@/components/marketing/SectionMarker";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PricingCard } from "@/components/marketing/PricingCard";
import { TradeIndex } from "@/components/marketing/TradeIndex";
import { JobTicket } from "@/components/marketing/JobTicket";
import { MetaStamp } from "@/components/marketing/MetaStamp";
import { Perforation } from "@/components/marketing/Perforation";
import { BrandStamp } from "@/components/marketing/BrandStamp";
import { JobsTableMockup, ScheduleMockup, QuoteMockup, ReportMockup } from "@/components/marketing/FeatureMockup";
import { PUBLIC_PLANS } from "@/lib/plans-public";

const TRADES = [
    { name: "Plumbers", detail: "Service callouts, hot water swaps, bathroom & kitchen rough-ins, drainage." },
    { name: "Electricians", detail: "Switchboards, lighting, solar, EV chargers — with compliance certs filed.", tag: "Sparkies" },
    { name: "Carpenters", detail: "Framing, fix-out, finish, decks, pergolas — quoted by section.", tag: "Chippies" },
    { name: "Roofers", detail: "Re-roofs, leak inspections, gutters & downpipes — site reports with photo evidence." },
    { name: "HVAC & aircon", detail: "Splits, ducted systems, service contracts per asset." },
    { name: "Painters & tilers", detail: "Prep, finish, fitouts — sectioned quotes with reusable line items." },
    { name: "Concreters & pavers", detail: "Slabs, driveways, paths — schedule pours and crew assignments." },
    { name: "Builders", detail: "Multi-trade jobs with subbie coordination, variations, and the full project file." },
];

export const metadata: Metadata = {
    title: "THOR — An operating system for the trades",
    description:
        "Run jobs, scheduling, quotes, invoices and reports from one place. Built in Australia for trades and construction businesses.",
};

const FEATURES = [
    { icon: Briefcase, title: "Jobs & projects", body: "Track every job from lead to invoice. Assign your crew and see where work stands at a glance." },
    { icon: Calendar, title: "Scheduling", body: "Drag-and-drop calendar with appointments, time blocks, and crew assignments." },
    { icon: FileText, title: "Quotes & invoices", body: "Sectioned quotes, branded PDFs, and one-click conversion to invoices." },
    { icon: Users, title: "Contacts & companies", body: "A real CRM. Residential clients and commercial accounts side by side, with full job history." },
    { icon: Camera, title: "Reports & photos", body: "Custom report templates with photos, signatures and repeating sections — sent as branded PDFs." },
    { icon: Clock, title: "Mobile timesheets", body: "Crew clock in from the field. Hours flow straight into job costing." },
];

export default function MarketingHome() {
    return (
        <>
            {/* HERO — typographic editorial cover */}
            <SlateHero size="tall">
                {/* Masthead row — stacks on mobile, side-by-side from sm */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-14 sm:mb-20 lg:mb-28">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            Tradie OS
                        </p>
                        <p className="hidden sm:block font-statement italic text-[13px] text-white/40">
                            From the field — Issue 01
                        </p>
                    </div>
                    <BrandStamp serial="0042" surface="dark" className="self-start sm:self-auto" />
                </div>

                {/* The headline takes the whole stage */}
                <h1 className="font-statement text-[44px] sm:text-[64px] md:text-[100px] lg:text-[140px] xl:text-[176px] font-bold tracking-[-0.032em] leading-[0.95] sm:leading-[0.92] text-white text-balance">
                    For the people<br />
                    who <span className="italic font-medium text-white/75">build</span>{" "}
                    everything else.
                </h1>

                {/* Subhead column — stacks on mobile, two-up from lg */}
                <div className="mt-12 sm:mt-16 lg:mt-20 grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 lg:items-end">
                    <p className="text-base sm:text-lg md:text-xl text-white/55 max-w-md leading-[1.55]">
                        An operating system for plumbers, sparkies, chippies, roofers, builders — and the specialists in between.
                    </p>
                    <div className="flex flex-col items-start lg:items-end gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Button asChild className="h-11 px-6 rounded-md text-[14px] font-medium bg-white text-foreground hover:bg-white/90">
                                <Link href="/signup">
                                    Begin 30-day trial
                                    <ArrowRight className="ml-2 w-3.5 h-3.5" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-11 px-6 rounded-md text-[14px] font-medium bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                                <Link href="/features">Tour the product</Link>
                            </Button>
                        </div>
                        <p className="text-[12px] italic font-statement text-white/35">
                            No card required. Cancel anytime.
                        </p>
                    </div>
                </div>

                {/* Bottom annotation bar — wraps cleanly with consistent gaps.
                    On mobile we trim to just the most important two so it stays one line. */}
                <div className="mt-12 sm:mt-16 lg:mt-28 pt-6 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2.5">
                    <MetaStamp surface="dark">Est. Melbourne 2026</MetaStamp>
                    <MetaStamp surface="dark" className="hidden sm:inline-flex">Trades · Resi · Light Commercial</MetaStamp>
                    <MetaStamp surface="dark">GST · ABN · Xero ready</MetaStamp>
                    <MetaStamp surface="dark" className="hidden sm:inline-flex">AS/NZS aware</MetaStamp>
                </div>
            </SlateHero>

            {/* IN SERVICE — scale-contrast moment */}
            <section>
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-28">
                    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-16 lg:items-end">
                        <div>
                            <MetaStamp className="mb-3 sm:mb-4">In service · live count</MetaStamp>
                            <p className="font-statement text-[88px] sm:text-[140px] md:text-[180px] lg:text-[220px] xl:text-[240px] font-bold tracking-[-0.04em] leading-[0.85] text-foreground tabular-nums">
                                4,200
                            </p>
                        </div>
                        <div className="space-y-4 sm:space-y-5 pb-3 lg:pb-6">
                            <p className="font-statement text-lg sm:text-xl md:text-2xl font-semibold tracking-[-0.018em] leading-tight text-foreground text-balance">
                                Jobs run on THOR last month.
                            </p>
                            <ul className="space-y-2 text-[14px] text-muted-foreground">
                                <li className="flex items-baseline gap-3">
                                    <span className="font-mono text-[12px] tabular-nums text-foreground/55">8,940</span>
                                    <span>quotes sent · 73% accepted</span>
                                </li>
                                <li className="flex items-baseline gap-3">
                                    <span className="font-mono text-[12px] tabular-nums text-foreground/55">312</span>
                                    <span>crews dispatched daily</span>
                                </li>
                                <li className="flex items-baseline gap-3">
                                    <span className="font-mono text-[12px] tabular-nums text-foreground/55">42</span>
                                    <span>trade businesses · all sizes</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* FEATURE GRID */}
            <section id="features" className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-3xl mb-16">
                        <SectionMarker mark="II." label="The shape of it" />
                        <h2 className="mt-6 font-statement text-[40px] sm:text-5xl md:text-6xl font-bold tracking-[-0.024em] leading-[1.02]">
                            Six modules.<br />
                            <span className="italic font-medium text-muted-foreground">One workspace.</span>
                        </h2>
                        <p className="mt-7 text-lg text-muted-foreground max-w-2xl leading-[1.6]">
                            Replace the spreadsheets, the SMS group, and the three other tools you&apos;re using to glue your business together.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {FEATURES.map((f) => (
                            <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
                        ))}
                    </div>
                    <div className="mt-12">
                        <Link href="/features" className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground hover:underline underline-offset-4">
                            Tour every feature
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* TRADES INDEX — ICP */}
            <section className="bg-secondary/40 bg-grain">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start mb-12 lg:mb-16">
                        <div className="lg:sticky lg:top-32">
                            <SectionMarker mark="III." label="The trades index" />
                            <h2 className="mt-6 font-statement text-[32px] sm:text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                For the people who <span className="italic font-medium">build</span>, install, and fix.
                            </h2>
                            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.65] max-w-md">
                                THOR is shaped for the trades — not retro-fitted from a generic CRM. Every workflow speaks the language of the site box, the toolbox, and the ute.
                            </p>
                            <div className="mt-8 flex items-center gap-3">
                                <MetaStamp>Trades · resi · light commercial</MetaStamp>
                            </div>
                        </div>
                        <div>
                            <TradeIndex items={TRADES} />
                            <p className="mt-6 text-[13px] italic font-statement text-muted-foreground">
                                — and the specialists in between: glaziers, locksmiths, solar installers, kitchen fitters, security techs.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* DEEP DIVE 1 — Jobs & scheduling */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <SectionMarker mark="IV." label="Jobs & scheduling" />
                            <div className="mt-3"><MetaStamp>For: every trade · every crew size</MetaStamp></div>
                            <h3 className="mt-5 font-statement text-[32px] sm:text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                One place for every job, every appointment, every assignment.
                            </h3>
                            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.65]">
                                Your office and your site team see the same schedule. Drag a job onto next Tuesday and your sparky knows where to be. Mark it complete from the field and the office sees it close — without anyone chasing the WhatsApp group.
                            </p>
                            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {[
                                    "Kanban or list view",
                                    "Multi-assignee jobs",
                                    "Status, priority, dependencies",
                                    "Inline file attachments",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3 text-[14px]">
                                        <span aria-hidden className="mt-[9px] w-3 h-px shrink-0 bg-foreground/40" />
                                        <span className="text-foreground/85">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative max-w-[320px] mx-auto sm:max-w-md lg:max-w-none w-full">
                            <ScheduleMockup />
                        </div>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* DEEP DIVE 2 — Quotes → invoices */}
            <section className="bg-secondary/40 bg-grain">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="lg:order-2">
                            <SectionMarker mark="V." label="Quotes → invoices" />
                            <div className="mt-3"><MetaStamp>For: builders · plumbers · landscapers · subbies</MetaStamp></div>
                            <h3 className="mt-5 font-statement text-[32px] sm:text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                From estimate to paid in a few clicks.
                            </h3>
                            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.65]">
                                Sectioned quotes for trades that work in stages — demo, plumbing, fitout. Pricing book of reusable items. GST handled, ABN on every PDF, and a one-click sync to Xero so your bookkeeper isn&apos;t re-keying numbers.
                            </p>
                            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {[
                                    "Pricing book of reusable items",
                                    "Branded PDF generation",
                                    "Email send-and-track",
                                    "Xero invoice sync",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3 text-[14px]">
                                        <span aria-hidden className="mt-[9px] w-3 h-px shrink-0 bg-foreground/40" />
                                        <span className="text-foreground/85">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="lg:order-1 max-w-[320px] mx-auto sm:max-w-md lg:max-w-none w-full">
                            <QuoteMockup />
                        </div>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* DEEP DIVE 3 — Reports */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <SectionMarker mark="VI." label="Reports & photos" />
                            <div className="mt-3"><MetaStamp>For: sparkies · plumbers · roofers · builders</MetaStamp></div>
                            <h3 className="mt-5 font-statement text-[32px] sm:text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                Site reports clients <span className="italic font-medium">actually</span> read.
                            </h3>
                            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-[1.65]">
                                Compliance certs for sparkies. Defect lists for builders. Pre-start checks for HVAC. Photos and signatures captured on-site, formatted into branded PDFs.
                            </p>
                            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {[
                                    "Drag-and-drop builder",
                                    "Photo capture with notes",
                                    "On-device signatures",
                                    "Send and track delivery",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3 text-[14px]">
                                        <span aria-hidden className="mt-[9px] w-3 h-px shrink-0 bg-foreground/40" />
                                        <span className="text-foreground/85">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative max-w-[320px] mx-auto sm:max-w-md lg:max-w-none w-full">
                            <ReportMockup />
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIAL — styled as a job ticket */}
            <section className="bg-black text-white border-t border-white/10">
                <div className="mx-auto max-w-5xl px-6 lg:px-10 py-16 sm:py-20 lg:py-28">
                    <div className="text-center mb-12">
                        <SectionMarker mark="VII." label="In the field" surface="dark" className="justify-center" />
                    </div>
                    <JobTicket
                        kind="Testimonial"
                        reference="J-2041"
                        issued="14 / 03 / 2026"
                        status="Verified"
                        surface="dark"
                        signature={{
                            name: "Marcus K.",
                            meta: "Director · Pinnacle Plumbing · Hawthorn, VIC",
                        }}
                    >
                        <blockquote className="font-statement text-2xl md:text-[36px] font-semibold tracking-[-0.018em] leading-[1.2] text-white text-balance">
                            <span className="font-statement italic font-medium text-white/30">&ldquo;</span>
                            We replaced four tools with THOR. The crew actually uses it on-site — which is the part <span className="italic font-medium text-white/85">nobody else solved</span>.
                            <span className="font-statement italic font-medium text-white/30">&rdquo;</span>
                        </blockquote>
                    </JobTicket>
                </div>
            </section>

            {/* PRICING TEASER */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-2xl mx-auto text-center mb-14">
                        <SectionMarker mark="VIII." label="Pricing" className="justify-center" />
                        <h2 className="mt-6 font-statement text-[40px] sm:text-5xl md:text-6xl font-bold tracking-[-0.024em] leading-[1.02]">
                            Per seat. <span className="italic font-medium text-muted-foreground">No surprises.</span>
                        </h2>
                        <p className="mt-6 text-lg text-muted-foreground leading-[1.6]">
                            All plans include unlimited jobs, contacts, and projects.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {PUBLIC_PLANS.map((plan) => (
                            <PricingCard key={plan.id} plan={plan} cycle="monthly" />
                        ))}
                    </div>
                    <p className="mt-12 text-center">
                        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground hover:underline underline-offset-4">
                            See full pricing & FAQ
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </p>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="bg-black text-white relative overflow-hidden">
                <div
                    aria-hidden
                    className="absolute -top-48 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full opacity-50 blur-[120px]"
                    style={{ background: "radial-gradient(closest-side, hsla(16,87%,55%,0.15), hsla(16,87%,55%,0) 70%)" }}
                />
                <div className="relative mx-auto max-w-5xl px-6 lg:px-10 py-28 lg:py-36 text-center">
                    <h2 className="font-statement text-[40px] sm:text-5xl md:text-7xl font-bold tracking-[-0.025em] leading-[1.02] max-w-3xl mx-auto text-balance">
                        Less time on admin. <span className="italic font-medium text-white/55">More time on the tools.</span>
                    </h2>
                    <p className="mt-8 text-base md:text-lg text-white/50 max-w-xl mx-auto italic font-statement">
                        Thirty days free. No card required.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
                        <Button asChild className="h-11 px-7 rounded-md text-[14px] font-medium bg-white text-foreground hover:bg-white/90">
                            <Link href="/signup">
                                Begin trial
                                <ArrowRight className="ml-2 w-3.5 h-3.5" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-7 rounded-md text-[14px] font-medium bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/contact">Talk to us</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
