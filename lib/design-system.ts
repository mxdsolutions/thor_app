import { type CSSProperties } from "react";

/**
 * MXD Web Template Design System
 * ─────────────────────────
 * Central file for shared styles, typography, spacing, and component patterns.
 */

/* ── Typography ── */

/** Page-level heading */
export const pageHeaderClass = "text-2xl font-bold tracking-tight";

/** Large page heading for overview/hero */
export const heroHeaderClass = "text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]";

/** Section subheading */
export const sectionHeaderClass = "text-sm font-semibold";

/** Body/paragraph text */
export const bodyTextClass = "text-sm text-muted-foreground leading-relaxed";

/** Caption text — smallest description text */
export const captionClass = "text-[11px] text-muted-foreground";

/** Uppercase label (e.g. stat card labels, section labels) */
export const labelClass = "text-[10px] text-muted-foreground uppercase tracking-widest font-semibold";

/** Stat label — slightly larger for metric cards */
export const statLabelClass = "text-[11px] text-muted-foreground uppercase tracking-wide";

/** Stat value — large bold value */
export const statValueClass = "text-xl font-bold tracking-tight";

/* ── Spacing ── */

/** Standard gap between cards and sections */
export const cardGap = "gap-3";

/** Standard vertical spacing between page sections */
export const sectionSpacing = "space-y-6";

/** Standard content padding — reclaimed on mobile */
export const contentPadding = "px-4 md:px-6 lg:px-10";

/** Max width container */
export const containerMaxWidth = "max-w-5xl mx-auto";

/* ── Sidebar Navigation ── */

export const sidebarWidth = "w-64";

export const navLinkBase =
    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative";

export const navLinkActive = "bg-secondary text-foreground";

export const navLinkInactive =
    "text-muted-foreground hover:text-foreground hover:bg-secondary/60";

/** Nav section label */
export const navSectionLabel = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50";

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

/* ── Animation Variants (Framer Motion) ── */

export const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

export const fadeInUp = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4 } },
} as const;

export const hoverLift = {
    whileHover: { y: -2 },
    transition: { type: "spring", stiffness: 400, damping: 17 },
};

/* ── Icon Sizing ── */

export const iconSm = "w-[18px] h-[18px]";
export const iconMd = "w-5 h-5";
export const iconLg = "w-6 h-6";
