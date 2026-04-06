# Line Items Feature Module

Shared components for product line item management, used by both side sheets (live API mode) and conversion modals (draft local mode).

## Components

- **`LineItemsTable`** — Full table with add row, inline editing, delete, and totals footer
  - `mode: "live"` — Calls API endpoints for CRUD; used in JobSideSheet, LeadSideSheet
  - `mode: "draft"` — Parent manages array via `onItemsChange`; used in CreateJobFromOpportunityModal
- **`InlineNumberInput`** — Click-to-edit number field with Enter/Escape/blur handling

## API Endpoints (live mode)

- `/api/job-line-items` — GET, POST, PATCH, DELETE
- `/api/lead-line-items` — GET, POST, PATCH, DELETE

Both endpoints auto-recalculate parent entity totals via `app/api/_lib/line-items.ts`.
