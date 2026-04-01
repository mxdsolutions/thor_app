# Opportunities View

CRM opportunity pipeline — Kanban board and table views with stage-based workflow.

## Key Components

- `page.tsx` — Kanban board with drag-and-drop stage transitions, plus table view toggle
- `components/sheets/OpportunitySideSheet.tsx` — Detail view with value/probability card, line items, notes, activity
- `components/modals/CreateOpportunityModal.tsx` — New opportunity creation
- `components/modals/CreateJobFromOpportunityModal.tsx` — Opportunity-to-job conversion (closed_won trigger)
- `features/line-items/LineItemsTable.tsx` — Shared line items table (live mode)

## Data Flow

- **SWR hook**: `useOpportunities()` → `GET /api/opportunities` (paginated, searchable)
- **Stage change**: `PATCH /api/opportunities` — triggers closed_won modal when appropriate
- **Line items**: `GET/POST/PATCH/DELETE /api/opportunity-line-items` — auto-recalculates opportunity value
