/**
 * THOR: Tradie OS Design System
 * ─────────────────────────
 * Central file for shared styles, typography, spacing, and component patterns.
 */

/* ── Typography ── */

/** Page title — used in DashboardControls / sticky header context.
 *  Renders in Antonio via the base `h1`–`h6` rule in globals.css, so
 *  this class string should be applied to semantic heading elements. */
export const pageHeadingClass = "text-3xl font-bold uppercase";

/** Top-of-card / in-card section title.
 *  Renders in Antonio via the base `h1`–`h6` rule, so apply to a
 *  semantic heading element (`<h2>` / `<h3>`). Use this for the primary
 *  title at the top of a settings card, plan summary card, etc. — not
 *  for list-item headings or banner alert titles (those stay smaller). */
export const sectionHeadingClass = "text-xl font-bold uppercase tracking-wide text-foreground";

// --- Stats ---

/** Stat label — metric cards */
export const statLabelClass = "text-[11px] text-muted-foreground uppercase tracking-wide";

/** Stat value — large display number. Must be rendered in an `<h*>` tag so
 *  the base layer picks up Antonio automatically. */
export const statValueClass = "text-4xl font-bold tracking-wide";

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
