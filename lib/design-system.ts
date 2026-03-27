/**
 * MXD Web Template Design System
 * ─────────────────────────
 * Central file for shared styles, typography, spacing, and component patterns.
 */

/* ── Typography ── */

/** Stat label — slightly larger for metric cards */
export const statLabelClass = "text-[11px] text-muted-foreground uppercase tracking-wide";

/** Stat value — large bold value */
export const statValueClass = "text-xl font-bold tracking-tight";

/* ── Spacing ── */

/** Standard gap between cards and sections */
export const cardGap = "gap-3";

/* ── Table Styles ── */

export const tableBase = "w-full text-sm text-left";

export const tableHead = "bg-secondary/50";

export const tableHeadCell = "py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider";

export const tableRow = "border-b border-border/40 transition-colors hover:bg-muted/30";

export const tableCell = "py-4 md:py-5 align-middle";

export const tableCellMuted = "p-3 text-muted-foreground";

/* ── Filter Pills ── */

export const filterPillBase = "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors";
export const filterPillActive = "bg-foreground text-background border-foreground";
export const filterPillInactive = "bg-secondary text-muted-foreground border-border/50 hover:bg-secondary/80 hover:text-foreground";
