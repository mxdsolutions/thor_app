/**
 * MXD Web Template Design System
 * ─────────────────────────
 * Central file for shared styles, typography, spacing, and component patterns.
 */

/* ── Typography ── */

// --- Headings ---

/** Page title — used in DashboardControls / sticky header context.
 *  Renders in Antonio via the base `h1`–`h6` rule in globals.css, so
 *  this class string should be applied to semantic heading elements. */
export const pageHeadingClass = "text-3xl font-bold uppercase tracking-wide";

/** Section heading inside a page (card titles, tab subtitles) */
export const sectionHeadingClass = "text-xl font-bold uppercase tracking-wide text-foreground";

/** Side sheet title */
export const sheetTitleClass = "text-[22px] font-bold truncate leading-tight";

/** Modal / dialog title */
export const dialogTitleClass = "text-xl font-semibold leading-none tracking-tight";

/** Hero heading — onboarding / auth splash pages */
export const heroHeadingClass = "text-5xl md:text-6xl font-bold tracking-tight";

/** Hero sub-heading */
export const heroSubheadingClass = "text-4xl md:text-5xl font-bold tracking-tight";

// --- Body ---

/** Standard body text */
export const bodyClass = "text-sm text-foreground";

/** Body text — slightly larger for prominent content (dialog descriptions, detail values) */
export const bodyLargeClass = "text-[15px] text-foreground";

/** Muted secondary text (subtitles, helper text) */
export const bodyMutedClass = "text-sm text-muted-foreground";

// --- Labels ---

/** Form field label */
export const fieldLabelClass = "text-sm font-medium text-muted-foreground";

/** Uppercase section / category label */
export const sectionLabelClass = "text-[11px] font-bold text-muted-foreground uppercase tracking-wider";

/** Uppercase section label — softer variant */
export const sectionLabelSoftClass = "text-xs uppercase tracking-wider font-semibold text-muted-foreground/60";

// --- Stats ---

/** Stat label — metric cards */
export const statLabelClass = "text-[11px] text-muted-foreground uppercase tracking-wide";

/** Stat value — large display number. Must be rendered in an `<h*>` tag so
 *  the base layer picks up Antonio automatically. */
export const statValueClass = "text-4xl font-bold tracking-wide";

// --- Interactive ---

/** Navigation item (sidebar) */
export const navItemClass = "text-sm font-medium";

/** Tab button */
export const tabClass = "text-[17px] font-medium";

/** Badge / status pill */
export const badgeClass = "text-[11px] font-semibold uppercase tracking-wider";

/** Small meta text (timestamps, ids) */
export const metaClass = "text-[10px] text-muted-foreground";

/* ── Spacing ── */

/** Standard gap between cards and sections */
export const cardGap = "gap-3";

/* ── Table Styles ── */

export const tableBase = "w-full text-[15px] text-left";

export const tableHead = "bg-secondary";

export const tableHeadCell = "py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider";

export const tableRow = "border-b border-border/40 transition-colors hover:bg-muted/30";

export const tableCell = "py-4 md:py-5 align-middle";

export const tableCellMuted = "p-3 text-muted-foreground";

/* ── Avatar surfaces ── */

/** Neutral avatar background — monochrome industrial, no brand gradient */
export const avatarSurfaceClass = "bg-secondary text-foreground";

/** Avatar initial text treatment */
export const avatarTextClass = "text-sm font-bold uppercase tracking-wide";

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
