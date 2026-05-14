import type { Metadata } from "next";
import { Clock, MapPin, MessageSquare, Sparkles } from "lucide-react";
import { SlateHero } from "@/components/marketing/SlateHero";
import { SectionMarker } from "@/components/marketing/SectionMarker";
import { BrandStamp } from "@/components/marketing/BrandStamp";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
    title: "Contact — THOR",
    description:
        "Get in touch with the THOR team. Sales enquiries, product questions, and support — answered by the team that built it.",
};

const META = [
    {
        icon: Clock,
        label: "Response time",
        value: "Within one business day",
    },
    {
        icon: MapPin,
        label: "Based in",
        value: "Melbourne, Australia",
    },
    {
        icon: MessageSquare,
        label: "Who answers",
        value: "Engineers and designers on the team",
    },
    {
        icon: Sparkles,
        label: "Already a customer?",
        value: "Pick “Existing customer support” in the form",
    },
];

export default function ContactPage() {
    return (
        <>
            {/* HERO */}
            <SlateHero size="compact">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-10 sm:mb-14 lg:mb-20">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            Get in touch
                        </p>
                        <p className="hidden sm:block font-statement italic text-[13px] text-white/40">
                            Vol. I — Doc. 05 · Direct line
                        </p>
                    </div>
                    <BrandStamp serial="0008" edition="VOL.I — DOC.05" surface="dark" className="self-start sm:self-auto" />
                </div>
                <div className="max-w-5xl">
                    <h1 className="font-statement text-[44px] sm:text-[64px] md:text-[96px] lg:text-[128px] font-bold tracking-[-0.03em] leading-[0.95] sm:leading-[0.92] text-white text-balance">
                        Talk to the team that <span className="italic font-medium text-white/75">built it</span>.
                    </h1>
                    <p className="mt-8 sm:mt-10 text-base sm:text-lg md:text-xl text-white/55 max-w-2xl leading-[1.55]">
                        Sales enquiries, product questions, or support — every message is read by an engineer or designer on the team.
                    </p>
                </div>
            </SlateHero>

            {/* FORM + META */}
            <section className="bg-background">
                <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20 sm:py-24 lg:py-32">
                    <div className="grid lg:grid-cols-[1.25fr_1fr] gap-10 sm:gap-12 lg:gap-24">
                        {/* FORM */}
                        <div>
                            <SectionMarker mark="I." label="Send a message" />
                            <h2 className="mt-6 font-statement text-4xl md:text-5xl font-bold tracking-[-0.022em] leading-[1.05]">
                                Tell us what you need.
                            </h2>
                            <p className="mt-6 text-base text-muted-foreground leading-[1.65] max-w-md">
                                We&apos;ll come back to you within one business day. Or skip ahead and start a free trial — no card required.
                            </p>
                            <div className="mt-12">
                                <ContactForm />
                            </div>
                        </div>

                        {/* META PANEL */}
                        <div>
                            <div className="rounded-2xl bg-black text-white p-8 space-y-7">
                                <div>
                                    <SectionMarker mark="II." label="What to expect" surface="dark" />
                                    <p className="mt-6 font-statement text-2xl md:text-[28px] font-semibold tracking-[-0.018em] leading-[1.25] text-white">
                                        Real people. Real product knowledge. <span className="italic font-medium text-white/65">Real fast.</span>
                                    </p>
                                </div>
                                <div className="pt-2 space-y-5 border-t border-white/10">
                                    {META.map((m) => (
                                        <div key={m.label} className="flex items-start gap-4 pt-4">
                                            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white/[0.06] shrink-0">
                                                <m.icon className="w-[16px] h-[16px] text-white/75" strokeWidth={1.75} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-semibold">{m.label}</p>
                                                <p className="text-[14px] font-medium text-white mt-1.5 leading-snug">{m.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
