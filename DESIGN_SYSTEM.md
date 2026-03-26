# MXD Design System
`@/lib/design-system.ts`

This document outlines the core tokens, utility classes, and design philosophy driving the **MXD** premium UI template. Our goal is extreme modularity, high performance, and consistent, sleek aesthetics, primarily anchored around a black/white/gray color palette with sharp typography.

> **Agent-readable reference.** Import shared constants and components to ensure visual consistency across the entire app.

---

## Typography

| Role | Font | CSS Class / Component |
|------|------|-----------------------|
| **Page headings** | Open Sans | `pageHeaderClass` |
| **Hero headings** | Open Sans | `heroHeaderClass` |
| **Section headers** | Open Sans | `sectionHeaderClass` |
| **Body text** | Open Sans | `bodyTextClass` |
| **Captions** | Open Sans | `captionClass` |
| **Labels** | Open Sans | `labelClass` (uppercase, tracked) |
| **Stat values** | Open Sans | `statValueClass` (bold focal point) |

### Using the Sans Font

Open Sans is the primary typeface. It is applied globally via `globals.css` and can be forced via the `sansFont` style object or the `font-sans` Tailwind class.

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

Use **Heroicons** (`@heroicons/react/24/outline`) for dashboard UI and **Lucide** for landing pages.

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
