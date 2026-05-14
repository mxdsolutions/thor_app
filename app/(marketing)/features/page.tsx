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
    FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fragment } from "react";
import { SlateHero } from "@/components/marketing/SlateHero";
import { SectionMarker } from "@/components/marketing/SectionMarker";
import { Perforation } from "@/components/marketing/Perforation";
import { BrandStamp } from "@/components/marketing/BrandStamp";
import {
    JobsTableMockup,
    ScheduleMockup,
    QuoteMockup,
    ReportMockup,
    ContactsMockup,
    TimesheetMockup,
} from "@/components/marketing/FeatureMockup";

export const metadata: Metadata = {
    title: "Features — THOR",
    description:
        "Every module in THOR explained. Jobs, scheduling, quotes & invoices, contacts, reports, timesheets, and file storage — all in one workspace.",
};

const MODULES = [
    { id: "jobs", icon: Briefcase, label: "Jobs" },
    { id: "scheduling", icon: Calendar, label: "Scheduling" },
    { id: "quotes", icon: FileText, label: "Quotes & Invoices" },
    { id: "contacts", icon: Users, label: "Contacts" },
    { id: "reports", icon: Camera, label: "Reports" },
    { id: "timesheets", icon: Clock, label: "Timesheets" },
    { id: "files", icon: FolderOpen, label: "Files" },
];

const ROMAN = ["I.", "II.", "III.", "IV.", "V.", "VI.", "VII."];

interface FeatureSection {
    id: string;
    label: string;
    title: React.ReactNode;
    body: string;
    bullets: string[];
    mockup?: React.ReactNode;
    align?: "left" | "right";
}

const SECTIONS: FeatureSection[] = [
    {
        id: "jobs",
        label: "Jobs",
        title: <>Every job, visible to <span className="italic font-medium">everyone</span> who needs it.</>,
        body: "From first call to final invoice, jobs are the spine of THOR. Track status, assign your crew, attach contacts and companies, and roll up costs by job.",
        bullets: [
            "Auto-allocated reference IDs",
            "Multi-assignee with availability check",
            "Status, priority, and dependencies",
            "Job costing rolls up timesheets and expenses",
            "File attachments straight on the job record",
            "Inline notes and activity log",
        ],
        mockup: <JobsTableMockup />,
        align: "right",
    },
    {
        id: "scheduling",
        label: "Scheduling",
        title: <>Drag and drop. The crew sees the move <span className="italic font-medium">instantly</span>.</>,
        body: "Your office and your site team see the same schedule. Drag a job onto next Tuesday and your sparky knows where to be. Cancellations and reschedules are a single drag.",
        bullets: [
            "Day, week, and crew views",
            "Mobile-first calendar for the field",
            "Conflict detection on overlap",
            "Recurring appointments",
            "Sync to Outlook (on Forged plan)",
            "Push notifications when shifts change",
        ],
        mockup: <ScheduleMockup />,
        align: "left",
    },
    {
        id: "quotes",
        label: "Quotes & Invoices",
        title: <>Estimate to paid in a few clicks.</>,
        body: "Build sectioned quotes from your pricing book, send a polished PDF to the client, and convert accepted quotes straight into invoices. Sync to Xero so your bookkeeper isn't re-keying numbers.",
        bullets: [
            "Pricing book of reusable line items",
            "Sectioned quotes with subtotals",
            "Branded PDF generation",
            "Email send-and-track delivery",
            "One-click quote → invoice",
            "Xero sync for invoice posting",
        ],
        mockup: <QuoteMockup />,
        align: "right",
    },
    {
        id: "contacts",
        label: "Contacts & companies",
        title: <>A real CRM. Not a spreadsheet with a UI.</>,
        body: "Residential clients and commercial accounts side by side. Every contact carries full job history, quotes sent, invoices outstanding, and notes from your last visit.",
        bullets: [
            "Unified contacts and companies",
            "Tagged residential vs commercial",
            "Full job and quote history per contact",
            "Saved searches and custom filters",
            "Inline communication notes",
            "Bulk import from CSV",
        ],
        mockup: <ContactsMockup />,
        align: "left",
    },
    {
        id: "reports",
        label: "Reports & photos",
        title: <>Site reports clients <span className="italic font-medium">actually</span> read.</>,
        body: "Build custom report templates per service: pre-start checks, completion sign-offs, defect lists, safety reports. Photos and signatures captured on-site, formatted into branded PDFs.",
        bullets: [
            "Drag-and-drop template builder",
            "Photo capture with annotations",
            "Repeating sections (defects, items)",
            "On-device customer signature",
            "Branded PDF output",
            "Send via email and track opens",
        ],
        mockup: <ReportMockup />,
        align: "right",
    },
    {
        id: "timesheets",
        label: "Timesheets",
        title: <>The crew clocks in. Hours flow straight into job costing.</>,
        body: "Clock in and out from the field — phone in pocket, no chasing paper at week's end. Hours flow straight into the job they belong to so you can see the real cost as work progresses.",
        bullets: [
            "Mobile clock-in with GPS option",
            "Per-job and travel time tracking",
            "Manager approval workflow",
            "Auto-roll into job costing",
            "Weekly export for payroll",
        ],
        mockup: <TimesheetMockup />,
        align: "left",
    },
];

export default function FeaturesPage() {
    return (
        <>
            {/* HERO */}
            <SlateHero size="tall">
                {/* Masthead row */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-12 sm:mb-16 lg:mb-20">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            The product
                        </p>
                        <p className="hidden sm:block font-statement italic text-[13px] text-white/40">
                            Vol. I — Doc. 02 · Modules I–VII
                        </p>
                    </div>
                    <BrandStamp serial="0107" edition="VOL.I — DOC.02" surface="dark" className="self-start sm:self-auto" />
                </div>

                <div className="max-w-5xl">
                    <h1 className="font-statement text-[44px] sm:text-[64px] md:text-[96px] lg:text-[128px] font-bold tracking-[-0.03em] leading-[0.95] sm:leading-[0.92] text-white text-balance">
                        Built for the <span className="italic font-medium text-white/75">way</span> trades run.
                    </h1>
                    <p className="mt-8 sm:mt-10 text-base sm:text-lg md:text-xl text-white/55 max-w-2xl leading-[1.55]">
                        Seven modules. One workspace. Every part of THOR is shaped by the rhythm of trades businesses — not a generic CRM bolted onto a calendar.
                    </p>
                </div>

                {/* Module pills — quieter rendering */}
                <div className="mt-16 flex flex-wrap gap-2">
                    {MODULES.map((m, i) => (
                        <a
                            key={m.id}
                            href={`#${m.id}`}
                            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] font-medium text-white/70 hover:bg-white/[0.07] hover:border-white/20 hover:text-white transition-colors"
                        >
                            <span className="font-statement italic text-white/40 text-[12px]">{ROMAN[i]}</span>
                            {m.label}
                        </a>
                    ))}
                </div>
            </SlateHero>

            {/* SECTIONS */}
            {SECTIONS.map((s, i) => {
                const surfaceLight = i % 2 === 0;
                return (
                    <Fragment key={s.id}>
                        {i > 0 && <Perforation />}
                        <section
                            id={s.id}
                            className={surfaceLight ? "bg-background" : "bg-secondary/40 bg-grain"}
                        >
                        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                            <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${s.align === "left" ? "lg:[&>*:first-child]:order-2" : ""}`}>
                                <div>
                                    <SectionMarker mark={ROMAN[i]} label={s.label} />
                                    <h2 className="mt-6 font-statement text-[32px] sm:text-4xl md:text-5xl lg:text-[52px] font-bold tracking-[-0.022em] leading-[1.04]">
                                        {s.title}
                                    </h2>
                                    <p className="mt-7 text-base md:text-lg text-muted-foreground leading-[1.65] max-w-xl">
                                        {s.body}
                                    </p>
                                    <ul className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                                        {s.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-3 text-[14px]">
                                                <span aria-hidden className="mt-[9px] w-3 h-px shrink-0 bg-foreground/40" />
                                                <span className="text-foreground/85">{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="max-w-[320px] mx-auto sm:max-w-md lg:max-w-none w-full">
                                    {s.mockup}
                                </div>
                            </div>
                        </div>
                        </section>
                    </Fragment>
                );
            })}

            {/* FILES — text-only on black */}
            <section id="files" className="bg-black text-white relative overflow-hidden">
                <div
                    aria-hidden
                    className="absolute -top-48 -right-48 w-[680px] h-[680px] rounded-full opacity-50 blur-[120px]"
                    style={{ background: "radial-gradient(closest-side, hsla(16,87%,55%,0.14), hsla(16,87%,55%,0) 70%)" }}
                />
                <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32">
                    <div className="max-w-3xl">
                        <SectionMarker mark="VII." label="Files" surface="dark" />
                        <h2 className="mt-6 font-statement text-[32px] sm:text-4xl md:text-5xl lg:text-[52px] font-bold tracking-[-0.022em] leading-[1.04] text-white text-balance">
                            Plans, photos, certificates — attached to the job they <span className="italic font-medium">belong to</span>.
                        </h2>
                        <p className="mt-7 text-lg text-white/55 leading-[1.65] max-w-xl">
                            No more &ldquo;send me the floor plan again&rdquo; texts. Every file lives on the job record where everyone can find it. Photos taken on-site sync up automatically.
                        </p>
                        <div className="mt-12 grid sm:grid-cols-3 gap-3">
                            {[
                                { label: "Plans & PDFs", body: "Versioned and searchable." },
                                { label: "Site photos", body: "Auto-tagged by job and date." },
                                { label: "Certificates", body: "Compliance docs in one place." },
                            ].map((f) => (
                                <div key={f.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                                    <p className="font-statement text-base font-semibold text-white">{f.label}</p>
                                    <p className="text-[13px] text-white/50 mt-1.5 leading-relaxed">{f.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-background">
                <div className="mx-auto max-w-5xl px-6 lg:px-10 py-16 sm:py-20 lg:py-32 text-center">
                    <SectionMarker mark="—" label="Try it free" className="justify-center" />
                    <h2 className="mt-6 font-statement text-[40px] sm:text-5xl md:text-6xl font-bold tracking-[-0.024em] leading-[1.02] text-balance">
                        See THOR with <span className="italic font-medium text-muted-foreground">your own jobs</span>.
                    </h2>
                    <p className="mt-7 text-lg text-muted-foreground max-w-xl mx-auto leading-[1.6]">
                        Thirty days free. No card required. Workspace ready in five minutes.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
                        <Button asChild className="h-11 px-7 rounded-md text-[14px] font-medium">
                            <Link href="/signup">
                                Begin trial
                                <ArrowRight className="ml-2 w-3.5 h-3.5" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-7 rounded-md text-[14px] font-medium">
                            <Link href="/pricing">See pricing</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
