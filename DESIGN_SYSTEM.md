# MXD Design System
`@/lib/design-system.ts`

This document outlines the core tokens, utility classes, and design philosophy driving the **MXD** premium UI template. Our goal is extreme modularity, high performance, and consistent, sleek aesthetics, primarily anchored around a black/white/gray color palette with sharp typography.

> **Agent-readable reference.** Import shared constants and components to ensure visual consistency across the entire app.

---

## Typography

All tokens are exported from `@/lib/design-system.ts`. Import and use them to keep sizing/weight consistent.

### Font Stack

| Role | Font | Application |
|------|------|-------------|
| **Primary** | Open Sans | All UI text — applied globally via `--font-open-sans` on `<body>` |
| **Display** | Bebas Neue | Accent/hero headings — available via `--font-bebas-neue` |

### Type Scale Reference

| Size Token | Tailwind | px | rem | Usage |
|-----------|----------|-----|------|-------|
| `text-[10px]` | — | 10 | 0.625 | Timestamps, meta IDs |
| `text-[11px]` | — | 11 | 0.688 | Stat labels, table headers, badges |
| `text-xs` | built-in | 12 | 0.75 | Small captions |
| `text-sm` | built-in | 14 | 0.875 | Body text, nav items, form labels, buttons |
| `text-[15px]` | — | 15 | 0.938 | Dialog descriptions, detail field values |
| `text-base` | built-in | 16 | 1.0 | Section headings inside sheets/tabs |
| `text-[17px]` | — | 17 | 1.063 | Side sheet tab buttons |
| `text-lg` | built-in | 18 | 1.125 | Page title (sticky header) |
| `text-xl` | built-in | 20 | 1.25 | Dialog titles, stat values |
| `text-[22px]` | — | 22 | 1.375 | Side sheet title |
| `text-2xl` | built-in | 24 | 1.5 | Large page headings |
| `text-3xl` | built-in | 30 | 1.875 | Auth page headings |
| `text-4xl` → `md:text-5xl` | built-in | 36→48 | Responsive | Hero sub-heading |
| `text-5xl` → `md:text-6xl` | built-in | 48→60 | Responsive | Hero main heading |

### Headings

| Role | Token | Size | Weight | Notes |
|------|-------|------|--------|-------|
| Page title (header bar) | `pageHeadingClass` | `text-lg` | `font-semibold` | `tracking-tight` |
| Section heading (cards, tabs) | `sectionHeadingClass` | `text-base` | `font-semibold` | — |
| Side sheet title | `sheetTitleClass` | `text-[22px]` | `font-bold` | `truncate leading-tight` |
| Modal / dialog title | `dialogTitleClass` | `text-xl` | `font-semibold` | `leading-none tracking-tight` |
| Hero heading | `heroHeadingClass` | `text-5xl md:text-6xl` | `font-bold` | `tracking-tight` |
| Hero sub-heading | `heroSubheadingClass` | `text-4xl md:text-5xl` | `font-bold` | `tracking-tight` |

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
| Stat value | `statValueClass` | `text-xl` | `font-bold` | `tracking-tight` |

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

### Accent Colors (stat cards, left borders)

```tsx
import { accentColors } from "@/lib/design-system";
// accentColors.violet → "border-l-violet-400"
// accentColors.blue → "border-l-blue-400"
// accentColors.emerald → "border-l-emerald-400"
```

Use `border-l-2` on cards, upgrading to `border-l-[3px]` on hover.

---

## Spacing & Layout

| Context | Value | Tailwind / Pattern |
|---------|-------|--------------------|
| Between cards | 12px | `gap-3` |
| Between page sections | 24px | `space-y-6` |
| Content area padding | 24–40px | `px-6 lg:px-10` |
| Content max width | 4xl/5xl | `max-w-4xl` (Settings) or `w-full` |

### Dashboard Components

Use the modular dashboard components from `@/components/dashboard/DashboardPage`:

- **`<DashboardPage>`**: Main wrapper for staggered animations and consistent vertical spacing.
- **`<DashboardHeader>`**: Consistent page title, subtitle, and action buttons.
- **`<DashboardControls>`**: Wrapper for search bars and filters.

---

## Component Patterns

### Cards

- Base: `rounded-2xl border bg-card shadow-sm`
- Content Internal: `p-6`

### Badges

- Status/Labels: `Badge` component with `rounded-full` pill styling.
- Tags: Small uppercase tracked labels.

### Buttons

- All buttons use `rounded-full` for a modern, friendly feel.
- Standard sizes: `h-10` (default), `h-11` (large/auth), `h-8` (small ghost).

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
  design-system.ts    ← Central tokens (sansFont, tableRow, etc.)
  utils.ts            ← cn() helper function
components/dashboard/
  DashboardPage.tsx   ← Modular layout wrapper components
app/
  globals.css         ← Root variables and Tailwind config
  layout.tsx          ← Root layout with Open Sans
  dashboard/
    layout.tsx        ← Sidebar navigation and shell
    page.tsx          ← Overview (Metric cards, activity table)
    users/            ← User management (Full-width table)
    products/         ← Product catalog (Full-width table)
```
