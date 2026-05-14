import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Hammer, ShieldCheck, Code2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlateHero } from "@/components/marketing/SlateHero";
import { SectionMarker } from "@/components/marketing/SectionMarker";
import { Perforation } from "@/components/marketing/Perforation";
import { BrandStamp } from "@/components/marketing/BrandStamp";

export const metadata: Metadata = {
    title: "About — THOR",
    description:
        "THOR is built in Australia for trades and construction businesses. Learn about the people behind it and what we believe.",
};

const VALUES = [
    {
        mark: "I.",
        icon: Hammer,
        title: "Built for the field",
        body: "If it doesn't work with one hand on a phone in the rain, it doesn't ship. The site team is the first audience for every feature — not an afterthought.",
    },
    {
        mark: "II.",
        icon: ShieldCheck,
        title: "Your data is yours",
        body: "Sydney-hosted Postgres. Your tenant is isolated at the database layer. Export everything as CSV anytime — no lock-in by accident.",
    },
    {
        mark: "III.",
        icon: Code2,
        title: "Calm software",
        body: "No notifications begging for engagement. No dashboards full of vanity metrics. The product disappears so the work can be the focus.",
    },
    {
        mark: "IV.",
        icon: Heart,
        title: "A long view",
        body: "We're a small Australian team building a tool we'd want to use. We answer support emails ourselves — and we plan to be here in ten years.",
    },
];

export default function AboutPage() {
    return (
        <>
            {/* HERO */}
            <SlateHero size="tall">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-12 sm:mb-16 lg:mb-20">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            Our story
                        </p>
                        <p className="hidden sm:block font-statement italic text-[13px] text-white/40">
                            Vol. I — Doc. 04 · The makers
                        </p>
                    </div>
                    <BrandStamp serial="0001" edition="VOL.I — DOC.04" surface="dark" className="self-start sm:self-auto" />
                </div>
                <div className="max-w-5xl">
                    <h1 className="font-statement text-[44px] sm:text-[64px] md:text-[96px] lg:text-[128px] font-bold tracking-[-0.03em] leading-[0.95] sm:leading-[0.92] text-white text-balance">
                        For the people who <span className="italic font-medium text-white/75">build</span> everything else.
                    </h1>
                    <p className="mt-8 sm:mt-10 text-base sm:text-lg md:text-xl text-white/55 max-w-2xl leading-[1.55]">
                        THOR exists because every tradie we know is running their business from a notebook, three group chats, and an inbox they can&apos;t keep up with. We thought we could do better.
                    </p>
                </div>
            </SlateHero>

            {/* MISSION */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-24">
                        <div>
                            <SectionMarker mark="I." label="Mission" />
                            <h2 className="mt-6 font-statement text-[32px] sm:text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                Tools that match the <span className="italic font-medium">rhythm</span> of trades businesses.
                            </h2>
                        </div>
                        <div className="space-y-6 text-lg text-muted-foreground leading-[1.7]">
                            <p>
                                Generic CRMs were built for software companies and lifted-and-shifted to construction. They make you bend your business to fit the tool.
                            </p>
                            <p>
                                THOR works the other way. Jobs are the unit of work — not deals or opportunities. Quotes carry sections like demolition, plumbing, fitout — not pipeline stages. Reports are the artefact your client asks for — not a dashboard nobody opens.
                            </p>
                            <p className="text-foreground font-medium">
                                Every part of the product is shaped for the trades — from the bookkeeper at the desk to the apprentice on a roof.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Perforation />

            {/* VALUES */}
            <section className="bg-secondary/40 bg-grain">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-2xl mb-16">
                        <SectionMarker mark="II." label="What we believe" />
                        <h2 className="mt-6 font-statement text-[34px] sm:text-4xl md:text-5xl font-bold tracking-[-0.024em] leading-[1.02]">
                            Four things we <span className="italic font-medium">won&apos;t</span> compromise on.
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        {VALUES.map((v) => (
                            <div key={v.title} className="rounded-2xl border border-border bg-card p-8">
                                <div className="flex items-center gap-4 mb-5">
                                    <span className="font-statement italic font-semibold text-foreground/45 text-base leading-none">
                                        {v.mark}
                                    </span>
                                    <span className="block w-px h-4 bg-foreground/15" aria-hidden />
                                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-black text-background">
                                        <v.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                                    </div>
                                </div>
                                <h3 className="font-statement text-[26px] font-semibold tracking-tight">{v.title}</h3>
                                <p className="mt-3 text-base text-muted-foreground leading-[1.65]">{v.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Perforation />

            {/* TEAM */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-2xl mb-14">
                        <SectionMarker mark="III." label="The team" />
                        <h2 className="mt-6 font-statement text-[34px] sm:text-4xl md:text-5xl font-bold tracking-[-0.024em] leading-[1.02]">
                            Small. <span className="italic font-medium">Australian.</span> Hands-on.
                        </h2>
                        <p className="mt-7 text-lg text-muted-foreground leading-[1.65] max-w-xl">
                            A small Melbourne-based team. Engineering, design, and support — no separate sales team selling you something the engineers haven&apos;t built yet.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { role: "Engineering", body: "Builds the product end-to-end." },
                            { role: "Design", body: "Owns every pixel and interaction." },
                            { role: "Support", body: "Answered by the team that built it." },
                        ].map((t) => (
                            <div key={t.role} className="rounded-2xl border border-border bg-card p-7">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">{t.role}</p>
                                <p className="mt-4 font-statement text-lg text-foreground leading-snug">{t.body}</p>
                            </div>
                        ))}
                    </div>
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
                        Want to <span className="italic font-medium text-white/55">see it</span> in action?
                    </h2>
                    <p className="mt-7 text-base md:text-lg text-white/50 max-w-xl mx-auto italic font-statement">
                        Thirty days free. No card required. Or get in touch and we&apos;ll show you around.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
                        <Button asChild className="h-11 px-7 rounded-md text-[14px] font-medium bg-white text-foreground hover:bg-white/90">
                            <Link href="/signup">
                                Begin trial
                                <ArrowRight className="ml-2 w-3.5 h-3.5" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-7 rounded-md text-[14px] font-medium bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                            <Link href="/contact">Get in touch</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
