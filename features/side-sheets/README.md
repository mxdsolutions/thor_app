# Side Sheets Feature Module

Shared layout for entity detail side sheets (jobs, leads, etc.).

## Components

- **`SideSheetLayout`** — Wraps Radix Sheet with standardized header (icon, title, badge, subtitle) and tab navigation. All entity side sheets use this as their outer shell.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `icon` | ReactNode | Icon element rendered in the header circle |
| `iconBg` | string | Tailwind bg class for the icon container |
| `title` | string | Entity name/description |
| `subtitle` | string | Secondary info (value, date, etc.) |
| `badge` | `{ label, dotColor }` | Status badge with colored dot |
| `tabs` | `{ id, label }[]` | Tab definitions |
| `activeTab` / `onTabChange` | string / function | Controlled tab state |

## Consumers

- `components/sheets/JobSideSheet.tsx`
- `components/sheets/LeadSideSheet.tsx`
