import { cn } from "@/lib/utils";

interface MockupShellProps {
    children: React.ReactNode;
    className?: string;
    /** Form/document code, e.g. "FORM 02 · JOBS" */
    formCode?: string;
    /** Document title, e.g. "Active jobs" */
    title?: string;
    /** Right-side metadata, e.g. "ISSUED 14/03/2026" */
    meta?: string;
}

/**
 * Artifact-style mockup framing — looks like a printed work order or carbon
 * copy, not a browser window. Cream paper background, document header with
 * form code + title + issued date, subtle paper texture via `bg-grain`,
 * and a soft "paper on desk" shadow.
 *
 * The unmistakable signal: this is a working document, not a screenshot.
 */
function MockupShell({ children, className, formCode = "FORM", title, meta }: MockupShellProps) {
    return (
        <div
            className={cn(
                "relative rounded-md bg-grain border border-foreground/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.28),0_16px_32px_-12px_rgba(0,0,0,0.12)] overflow-hidden",
                className,
            )}
            style={{ backgroundColor: "hsl(34 16% 96%)" }}
        >
            {/* Document header — looks like a stamped work order.
                Meta date is hidden on mobile to give the title room to breathe. */}
            <div className="px-4 sm:px-5 py-3 border-b border-foreground/15 flex items-baseline justify-between gap-4 bg-[hsl(34_18%_93%)]">
                <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] sm:tracking-[0.28em] text-foreground/50 whitespace-nowrap">
                        {formCode}
                    </span>
                    {title && (
                        <>
                            <span aria-hidden className="block w-px h-3 bg-foreground/20 shrink-0" />
                            <span className="font-statement italic text-[12px] sm:text-[13px] text-foreground/70 truncate">
                                {title}
                            </span>
                        </>
                    )}
                </div>
                {meta && (
                    <span className="hidden sm:inline font-mono text-[10px] tabular-nums text-foreground/45 whitespace-nowrap">
                        {meta}
                    </span>
                )}
            </div>
            <div className="bg-background/60">{children}</div>
        </div>
    );
}

/** Jobs list mockup — mirrors the dashboard overview "Active Jobs" table. */
export function JobsTableMockup({ className }: { className?: string }) {
    const rows = [
        { ref: "#J-2041", title: "Hawthorn kitchen reno", customer: "M. Kowalski", status: "in_progress", color: "bg-blue-500" },
        { ref: "#J-2040", title: "Caulfield bathroom rough-in", customer: "Pinnacle Builders", status: "active", color: "bg-amber-500" },
        { ref: "#J-2039", title: "Northcote hot water swap", customer: "T. Reilly", status: "in_progress", color: "bg-blue-500" },
        { ref: "#J-2038", title: "Brunswick cafe fitout", customer: "Fold & Steam Pty Ltd", status: "in_progress", color: "bg-blue-500" },
        { ref: "#J-2037", title: "Yarraville carport pour", customer: "S. Patel", status: "completed", color: "bg-emerald-500" },
    ];
    return (
        <MockupShell formCode="FORM 01 · JOBS" title="Active register" meta="W.E. 14/03/2026" className={className}>
            <div className="px-5 py-4">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <div>Job</div>
                    <div className="hidden sm:block">Customer</div>
                    <div>Status</div>
                </div>
                <div className="divide-y divide-border/60">
                    {rows.map((r) => (
                        <div key={r.ref} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-1 py-3">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground truncate">{r.title}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{r.ref}</p>
                            </div>
                            <p className="hidden sm:block text-[12px] text-muted-foreground truncate max-w-[140px]">{r.customer}</p>
                            <div className="flex items-center gap-1.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full", r.color)} />
                                <span className="text-[11px] font-medium text-muted-foreground capitalize">{r.status.replace("_", " ")}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MockupShell>
    );
}

/** Schedule mockup — week strip with chips. */
export function ScheduleMockup({ className }: { className?: string }) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const events = [
        { day: 0, top: 4, height: 26, label: "Hawthorn site visit", time: "8:30", color: "bg-blue-500" },
        { day: 1, top: 12, height: 22, label: "Caulfield bath rough-in", time: "10:00", color: "bg-amber-500" },
        { day: 2, top: 6, height: 18, label: "Quote walkthrough", time: "9:00", color: "bg-blue-500" },
        { day: 2, top: 38, height: 22, label: "Northcote install", time: "1:00", color: "bg-blue-500" },
        { day: 3, top: 16, height: 28, label: "Brunswick fitout", time: "10:30", color: "bg-blue-500" },
        { day: 4, top: 8, height: 16, label: "Yarraville handover", time: "9:00", color: "bg-emerald-500" },
    ];
    return (
        <MockupShell formCode="FORM 02 · SCHEDULE" title="Week of 11 — 15 Mar" meta="3 crews · 6 jobs" className={className}>
            <div className="p-5">
                <div className="grid grid-cols-5 gap-1.5 mb-2 px-1">
                    {days.map((d) => (
                        <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                            {d}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-5 gap-1.5 relative h-[220px] rounded-lg bg-secondary/40 p-1.5">
                    {days.map((_, dayIdx) => (
                        <div key={dayIdx} className="relative">
                            {events.filter((e) => e.day === dayIdx).map((e, i) => (
                                <div
                                    key={i}
                                    className={cn("absolute left-0 right-0 rounded-md p-1.5 text-white text-[9px] font-semibold leading-tight overflow-hidden", e.color)}
                                    style={{ top: `${e.top}%`, height: `${e.height}%` }}
                                >
                                    <div className="opacity-80">{e.time}</div>
                                    <div className="truncate">{e.label}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </MockupShell>
    );
}

/** Quote mockup — sectioned line items with totals. */
export function QuoteMockup({ className }: { className?: string }) {
    const sections = [
        { name: "Demolition", lines: [{ desc: "Strip existing tiles", qty: 1, amt: 480 }, { desc: "Remove vanity & toilet", qty: 1, amt: 220 }] },
        { name: "Plumbing", lines: [{ desc: "Re-rough hot/cold supply", qty: 1, amt: 1450 }, { desc: "Install new tapware", qty: 4, amt: 320 }] },
    ];
    const total = sections.flatMap((s) => s.lines).reduce((acc, l) => acc + l.amt * l.qty, 0);
    return (
        <MockupShell formCode="FORM 03 · QUOTE" title="Q-1042 — M. Kowalski" meta="Issued 11/03/2026" className={className}>
            <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Quote</p>
                        <p className="font-statement text-xl sm:text-2xl font-bold tracking-tight truncate">Hawthorn bathroom reno</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 font-bold shrink-0">Sent</span>
                </div>
                {sections.map((s) => (
                    <div key={s.name}>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">{s.name}</p>
                        <div className="space-y-1.5">
                            {s.lines.map((l, i) => (
                                <div key={i} className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded-md hover:bg-secondary/50">
                                    <span className="text-foreground/85">{l.desc}</span>
                                    <span className="font-mono text-muted-foreground">${(l.amt * l.qty).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                    <span className="font-statement text-2xl font-bold tracking-tight tabular-nums">${total.toLocaleString()}</span>
                </div>
            </div>
        </MockupShell>
    );
}

/** Contacts mockup — searchable contact list with companies and tags. */
export function ContactsMockup({ className }: { className?: string }) {
    const contacts = [
        { name: "Marcus Kowalski", company: "Pinnacle Plumbing", initials: "MK", role: "Director", color: "bg-blue-500" },
        { name: "Sarah Patel", company: "—", initials: "SP", role: "Residential", color: "bg-emerald-500" },
        { name: "Theo Reilly", company: "Reilly Builders", initials: "TR", role: "Site Manager", color: "bg-amber-500" },
        { name: "Mei Chen", company: "Fold & Steam Pty", initials: "MC", role: "Owner", color: "bg-rose-500" },
        { name: "James O'Connor", company: "—", initials: "JO", role: "Residential", color: "bg-blue-500" },
    ];
    return (
        <MockupShell formCode="FORM 04 · CONTACTS" title="Register" meta="240 active" className={className}>
            <div className="p-5 space-y-3">
                <div className="h-9 rounded-lg border border-border bg-secondary/40 px-3 flex items-center text-[12px] text-muted-foreground">
                    Search contacts…
                </div>
                <div className="space-y-1">
                    {contacts.map((c) => (
                        <div key={c.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white", c.color)}>
                                {c.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-foreground truncate">{c.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {c.company !== "—" ? c.company : c.role}
                                </p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold">
                                {c.role.startsWith("Residen") ? "Res" : "Comm"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </MockupShell>
    );
}

/** Timesheet mockup — mobile clock in/out card. */
export function TimesheetMockup({ className }: { className?: string }) {
    return (
        <MockupShell formCode="FORM 05 · TIMESHEET" title="On the clock — today" meta="14/03/2026" className={className}>
            <div className="p-4 sm:p-5">
                <div className="rounded-2xl bg-foreground text-white p-4 sm:p-5 space-y-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-bold">Clocked into</p>
                        <p className="font-statement text-lg sm:text-xl font-bold mt-1 truncate">Hawthorn kitchen reno</p>
                        <p className="text-[11px] text-white/55 font-mono mt-0.5 truncate">#J-2041 · Started 8:32 AM</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-statement text-[40px] sm:text-5xl font-extrabold tabular-nums tracking-tight">04:18</span>
                        <span className="text-xs text-white/50">elapsed</span>
                    </div>
                    <div className="h-10 rounded-lg bg-rose-500/90 text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center">
                        Stop & log
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Earlier today</p>
                    {[
                        { job: "Brunswick fitout", time: "1h 12m", to: "Caulfield" },
                        { job: "Travel", time: "0h 24m", to: "" },
                    ].map((e) => (
                        <div key={e.job} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50">
                            <span className="text-[12px] text-foreground">{e.job}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{e.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </MockupShell>
    );
}

/** Report wizard mockup — photo capture step. */
export function ReportMockup({ className }: { className?: string }) {
    return (
        <MockupShell formCode="FORM 06 · REPORT" title="Pre-start safety check" meta="Step 3 of 5" className={className}>
            <div className="p-5 space-y-4">
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Step 3 of 5</p>
                    <p className="font-statement text-xl font-bold tracking-tight mt-1">Site condition photos</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        "from-amber-200 to-amber-400",
                        "from-blue-200 to-blue-400",
                        "from-emerald-200 to-emerald-400",
                    ].map((g, i) => (
                        <div key={i} className={cn("aspect-square rounded-lg bg-gradient-to-br relative", g)}>
                            <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-bold text-white/90 truncate">
                                IMG_{1042 + i}.jpg
                            </span>
                        </div>
                    ))}
                </div>
                <div className="rounded-lg border border-dashed border-border py-4 text-center">
                    <p className="text-[11px] text-muted-foreground">+ Add photo</p>
                </div>
                <div className="flex gap-2 pt-1">
                    <div className="flex-1 h-9 rounded-lg bg-secondary text-[12px] font-semibold flex items-center justify-center text-muted-foreground">Back</div>
                    <div className="flex-1 h-9 rounded-lg bg-foreground text-background text-[12px] font-semibold flex items-center justify-center">Next step</div>
                </div>
            </div>
        </MockupShell>
    );
}
