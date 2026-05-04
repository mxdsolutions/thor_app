# THOR: Tradie OS Design System
`@/lib/design-system.ts`

This document outlines the core tokens, utility classes, and design philosophy driving the **THOR** premium UI template. Our goal is extreme modularity, high performance, and consistent, sleek aesthetics, primarily anchored around a black/white/gray color palette with sharp typography.

> **Agent-readable reference.** Import shared constants and components to ensure visual consistency across the entire app.

---

## Typography

All tokens are exported from `@/lib/design-system.ts`. Import and use them to keep sizing/weight consistent.

### Font Stack

| Role | Font | Application |
|------|------|-------------|
| **Primary** | IBM Plex Sans | Body text, inputs, buttons, labels — wired to `--font-sans` via `--font-plex-sans` on `<body>`. Chosen for its industrial/engineered character to pair with Antonio. |
| **Display** | Antonio | All `h1`–`h6` headings (applied via `@layer base`), plus hero/accent text — available via `--font-antonio` / `font-display`. Real weights 100–700, industrial condensed feel. Apply `uppercase` for the all-caps display look. |

### Type Scale Reference

| Size Token | Tailwind | px | rem | Usage |
|-----------|----------|-----|------|-------|
| `text-[10px]` | — | 10 | 0.625 | Timestamps, meta IDs |
| `text-[11px]` | — | 11 | 0.688 | Stat labels, badges, dense meta |
| `text-xs` | built-in | 12 | 0.75 | Table headers, small captions |
| `text-sm` | built-in | 14 | 0.875 | Nav items, form labels, buttons |
| `text-[15px]` | — | 15 | 0.938 | Body text inside tables, select items, dialog descriptions |
| `text-base` | built-in | 16 | 1.0 | Input and select trigger text (prevents iOS zoom) |
| `text-[17px]` | — | 17 | 1.063 | Side sheet tab buttons |
| `text-lg` | built-in | 18 | 1.125 | Smaller section headings |
| `text-xl` | built-in | 20 | 1.25 | Section headings (`sectionHeadingClass`), dialog titles |
| `text-[22px]` | — | 22 | 1.375 | Side sheet title |
| `text-2xl` | built-in | 24 | 1.5 | Larger section headings |
| `text-3xl` | built-in | 30 | 1.875 | Page titles (`pageHeadingClass`), auth headings |
| `text-4xl` | built-in | 36 | 2.25 | Stat values (`statValueClass`) |
| `text-4xl` → `md:text-5xl` | built-in | 36→48 | Responsive | Hero sub-heading |
| `text-5xl` → `md:text-6xl` | built-in | 48→60 | Responsive | Hero main heading |

### Headings

Industrial display direction: `pageHeadingClass` and `sectionHeadingClass` both render in Antonio (via the base `h1`–`h6` rule) as bold uppercase. Apply them to semantic heading elements so they pick up the display font automatically.

| Role | Token | Actual classes |
|------|-------|----------------|
| Page title (header bar) | `pageHeadingClass` | `text-3xl font-bold uppercase tracking-wide` |
| Section heading (cards, tabs) | `sectionHeadingClass` | `text-xl font-bold uppercase tracking-wide text-foreground` |
| Side sheet title | `sheetTitleClass` | `text-[22px] font-bold truncate leading-tight` |
| Modal / dialog title | `dialogTitleClass` | `text-xl font-semibold leading-none tracking-tight` |
| Hero heading | `heroHeadingClass` | `text-5xl md:text-6xl font-bold tracking-tight` |
| Hero sub-heading | `heroSubheadingClass` | `text-4xl md:text-5xl font-bold tracking-tight` |

### Body Text

| Role | Token | Size | Weight | Color |
|------|-------|------|--------|-------|
| Standard body | `bodyClass` | `text-sm` | normal | `text-foreground` |
| Prominent body | `bodyLargeClass` | `text-[15px]` | normal | `text-foreground` |
| Muted / secondary | `bodyMutedClass` | `text-sm` | normal | `text-muted-foreground` |

### Labels & Captions

| Role | Token | Size | Weight | Styling |
|------|-------|------|--------|---------|
| Form field label | `fieldLabelClass` | `text-sm` | `font-medium` | `text-muted-foreground` |
| Section label (uppercase) | `sectionLabelClass` | `text-[11px]` | `font-bold` | `uppercase tracking-wider text-muted-foreground` |
| Section label (soft) | `sectionLabelSoftClass` | `text-xs` | `font-semibold` | `uppercase tracking-wider text-muted-foreground/60` |
| Stat label | `statLabelClass` | `text-[11px]` | `font-medium` | `uppercase tracking-wide text-muted-foreground` |
| Meta / timestamp | `metaClass` | `text-[10px]` | normal | `text-muted-foreground` |

### Interactive Elements

| Role | Token | Size | Weight | Notes |
|------|-------|------|--------|-------|
| Nav item | `navItemClass` | `text-sm` | `font-medium` | Sidebar links |
| Tab button | `tabClass` | `text-[17px]` | `font-medium` | Side sheet tabs |
| Badge / pill | `badgeClass` | `text-[11px]` | `font-semibold` | `uppercase tracking-wider` |
| Button text | (via `button.tsx`) | `text-sm` | `font-medium` | Inherited from CVA variants |
| Stat value | `statValueClass` | `text-4xl` | `font-bold` | `tracking-wide` (render on `<h*>` for Antonio) |

### Weight Scale

| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text, inputs, descriptions |
| 500 | `font-medium` | Labels, buttons, nav items, tabs |
| 600 | `font-semibold` | Section headings, dialog titles, badges |
| 700 | `font-bold` | Page titles, sheet titles, stat values, table headers |

### Responsive Typography

Only hero/auth headings scale responsively. All dashboard typography is fixed-size:

```
Hero main:   text-5xl → md:text-6xl
Hero sub:    text-4xl → md:text-5xl
Calendar:    text-xs  → sm:text-sm
```

### Dark Surface Text (Sidebar)

| State | Color |
|-------|-------|
| Active | `text-white` |
| Default | `text-white/50` |
| Section label | `text-white/30` |
| Meta | `text-white/40` |

---

## Color Palette

### Semantic Tokens (from CSS variables)

| Token | Usage |
|-------|-------|
| `bg-background` | Page/card backgrounds (white) |
| `bg-secondary` | Subtle fills, hover states, active nav |
| `bg-secondary/50` | Lighter hover fills |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text, labels |
| `border-border` | Card/table borders |

### Status & Priority Colors

Status-dot and priority-dot classes are exported from `@/lib/design-system` as `Record<>` maps — import and use them instead of hardcoding Tailwind colors in pages. See the "Status Colors" section below.

---

## Spacing & Layout

| Context | Value | Tailwind / Pattern |
|---------|-------|--------------------|
| Between cards | 12px | `gap-3` |
| Between page sections | 24px | `space-y-6` |
| Content area padding | 24–40px | `px-6 lg:px-10` |
| Content max width | 4xl/5xl | `max-w-4xl` (Settings) or `w-full` |

### Dashboard Components

Use the modular dashboard components from `@/components/dashboard/DashboardPage` and `@/lib/page-title-context`:

- **`<DashboardPage>`**: Main wrapper for staggered animations and consistent vertical spacing.
- **`<DashboardControls>`**: Wrapper row for search, filters, and the primary action button. Uses `justify-between` — left side is search + filters, right side is the action button.
- **`usePageTitle("Title")`**: Sets the page title in the global sticky header. Do **not** render a page title inline in the page body.
- **`<SegmentedControl>`** (`@/components/ui/segmented-control`): Shared component for tab switchers. Do not hand-roll tab UIs.
- **`<StatCard>`** (`@/components/dashboard/StatCard`): Flat stat-card wrapper for metric tiles on the overview page.

---

## Component Patterns

### Cards

- Base: `rounded-2xl border bg-card shadow-sm`
- Content Internal: `p-6`

### Badges

- Status/Labels: `Badge` component with `rounded-full` pill styling (one of the few places pill shape is retained, for legibility at small sizes).
- Tags: Small uppercase tracked labels.

### Buttons

- All buttons use `rounded-lg` (4px) to match the industrial radius scale and sit flush with cards and inputs. `rounded-full` is reserved for avatars and pill badges only.
- Standard sizes: `h-10` (default), `h-12` (large), `h-9` (small), `h-10 w-10` (icon).
- Icon-only buttons **must** carry an `aria-label` or `title` for screen-reader support.

### Filters

Status, type, and category filters use the Radix `Select` primitive from `@/components/ui/select`. The trigger ships with `rounded-xl border-border/50 h-10` as the default — pages should only specify `w-[Npx]` when a custom width is needed. Do **not** hand-roll pill filter buttons.

### Tables

Tables are "borderless" and bleed to the edges in the dashboard. Use consistent horizontal padding for cells to align with headers.

```tsx
<table className={tableBase}>
  <thead className={tableHead}>
    <tr>
      <th className={tableHeadCell + " pl-6 lg:pl-10"}>Label</th>
    </tr>
  </thead>
  <tbody>
    <tr className={tableRow}>
      <td className={tableCell + " pl-6 lg:pl-10"}>Value</td>
    </tr>
  </tbody>
</table>
```

---

## Status Colors

Status and priority indicators live in `@/lib/design-system` as centralised maps. Import and use these instead of hardcoding `bg-red-500` / `bg-emerald-500` / etc. in page code.

| Map | Keys | Usage |
|-----|------|-------|
| `jobStatusDotClass` | `completed`, `in_progress`, `cancelled` | Job status dots (fallback `bg-amber-500`) |
| `invoiceStatusDotClass` | `draft`, `submitted`, `authorised`, `paid`, `voided` | Invoice status dots |
| `quoteStatusDotClass` | `draft`, `sent`, `accepted`, `rejected`, `expired` | Quote status dots |
| `reportStatusDotClass` | `draft`, `in_progress`, `complete`, `submitted` | Report status dots |
| `priorityDotClass` | `1`–`4` (Urgent → Low) | Task/job priority dots |
| `paidStatusTextClass` | `not_paid`, `partly_paid`, `paid_in_full` | Payment status text color |

Helper: `getJobStatusDot(status)` returns the class with amber fallback for unknown statuses.

```tsx
import { getJobStatusDot } from "@/lib/design-system";
<div className={cn("w-1.5 h-1.5 rounded-full", getJobStatusDot(job.status))} />
```

Status colors remain literal Tailwind colors (`bg-red-500`, `bg-emerald-500`) rather than theme tokens — this is deliberate. Semantic status colors (red=bad, green=good) are well-known conventions; theming them would obscure meaning.

---

## Icons

Use **Tabler Icons** (`@tabler/icons-react`) for dashboard UI and **Lucide** for landing pages. Tabler's sharper, more technical stroke style fits the construction-industry aesthetic better than soft-cornered alternatives.

Import by their `Icon*` names (e.g. `IconPlus`, `IconTrash`, `IconUsersGroup`). Tabler components accept `size`, `stroke`, `color`, and `className` props.

| size | Variable | Value |
|------|----------|-------|
| Small | `iconSm` | `18px` |
| Medium | `iconMd` | `20px` |
| Large | `iconLg` | `24px` |

---

## Technical Utilities

### `cn()` Helper

Always use the `cn` utility from `@/lib/utils` for conditional class merging. Avoid local re-implementations.

```tsx
import { cn } from "@/lib/utils";
<div className={cn("base-classes", isActive && "active-classes")} />
```

---

## File Structure

```
lib/
  design-system.ts    ← Central tokens (typography, tables, status colors, avatars)
  motion.ts           ← Shared framer-motion variants (fadeInUp, staggerContainer)
  utils.ts            ← cn() helper function
components/
  dashboard/
    DashboardPage.tsx       ← DashboardPage + DashboardControls layout wrappers
    StatCard.tsx            ← Flat stat-card wrapper for metric tiles
    ScrollableTableLayout.tsx
  ui/
    button.tsx              ← rounded-lg industrial buttons
    input.tsx               ← rounded-xl form inputs
    select.tsx              ← rounded-xl select trigger + content
    segmented-control.tsx   ← Shared tab switcher
app/
  globals.css         ← @theme tokens, base layer (Antonio on h1–h6), radius overrides
  layout.tsx          ← Root layout with IBM Plex Sans (body) + Antonio (display)
  dashboard/
    DashboardShell.tsx ← Sidebar + sticky header with PageTitle
    overview/page.tsx  ← Stat cards + jobs / tasks split tables
```
