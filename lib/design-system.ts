/**
 * THOR: Tradie OS Design System
 * ─────────────────────────
 * Central file for shared styles, typography, spacing, and component patterns.
 */

/* ── Typography ── */

/** Page title — used in DashboardControls / sticky header context.
 *  Inter, semibold, sentence case — modern utility feel. Apply to a
 *  semantic heading element so the base layer picks up correct tracking. */
export const pageHeadingClass = "text-2xl font-semibold tracking-tight";

/** Top-of-card / in-card section title. Apply to `<h2>` / `<h3>`. */
export const sectionHeadingClass = "text-base font-semibold text-foreground";

// --- Stats ---

/** Stat label — metric cards. Uppercase + tracking is the deliberate
 *  utility cue (kept for small labels / column headers). */
export const statLabelClass = "text-[11px] text-muted-foreground uppercase tracking-wider font-medium";

/** Stat value — large display number with tabular numerics so columns
 *  of figures align cleanly. Apply to a semantic heading element. */
export const statValueClass = "text-3xl font-bold tracking-tight tabular-nums";

/* ── Spacing ── */

/** Standard gap between cards and sections */
export const cardGap = "gap-3";

/* ── Table Styles ── */

export const tableBase = "w-full text-base text-left";

export const tableHead = "bg-secondary";

export const tableHeadCell = "py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider";

export const tableRow = "border-b border-border/40 transition-colors hover:bg-muted/30";

export const tableCell = "py-4 md:py-5 align-middle";

export const tableCellMuted = "p-3 text-muted-foreground";

/* ── Avatar surfaces ── */

/** Neutral avatar background — monochrome industrial, no brand gradient */
export const avatarSurfaceClass = "bg-secondary text-foreground";

/* ── Status & priority dots ── */

/** Job status dot colors. Unknown/default → amber. */
export const jobStatusDotClass: Record<string, string> = {
    completed: "bg-emerald-500",
    in_progress: "bg-blue-500",
    cancelled: "bg-rose-500",
};

/** Invoice status dot colors */
export const invoiceStatusDotClass: Record<string, string> = {
    draft: "bg-gray-400",
    submitted: "bg-blue-500",
    authorised: "bg-indigo-500",
    paid: "bg-emerald-500",
    voided: "bg-red-500",
};

/** Quote status dot colors */
export const quoteStatusDotClass: Record<string, string> = {
    draft: "bg-gray-400",
    sent: "bg-blue-500",
    accepted: "bg-emerald-500",
    rejected: "bg-red-500",
    expired: "bg-amber-500",
};

/** Report status dot colors */
export const reportStatusDotClass: Record<string, string> = {
    draft: "bg-gray-400",
    in_progress: "bg-blue-500",
    complete: "bg-emerald-500",
    submitted: "bg-purple-500",
};

/** Priority dot colors — 1=Urgent, 2=High, 3=Normal, 4=Low */
export const priorityDotClass: Record<number, string> = {
    1: "bg-red-500",
    2: "bg-orange-500",
    3: "bg-blue-500",
    4: "bg-gray-400",
};

/** Paid-status text color — for invoice/job payment state */
export const paidStatusTextClass: Record<string, string> = {
    not_paid: "text-rose-500",
    partly_paid: "text-amber-500",
    paid_in_full: "text-emerald-500",
};

/** Helper — returns job status dot class with amber fallback for unknown states */
export const getJobStatusDot = (status?: string | null): string =>
    (status && jobStatusDotClass[status]) || "bg-amber-500";

/* ── Platform admin shell ── */

/** Hover surface for items on the dark platform-admin sidebar. */
export const platformAdminNavHoverSurfaceClass = "hover:bg-white/[0.07]";

/** Composite inactive-link class for platform-admin nav rows.
 *  Centralised so the hex doesn't leak across files. */
export const platformAdminNavInactiveClass =
    "text-[#7b819a] hover:text-white hover:bg-white/[0.07]";
