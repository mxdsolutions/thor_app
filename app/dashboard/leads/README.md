# Leads View

CRM lead pipeline — Kanban board and table views with stage-based workflow.

## Key Components

- `page.tsx` — Kanban board with drag-and-drop stage transitions, plus table view toggle
- `components/sheets/LeadSideSheet.tsx` — Detail view with value/probability card, line items, notes, activity
- `components/modals/CreateLeadModal.tsx` — New lead creation
- `components/modals/CreateJobFromOpportunityModal.tsx` — Lead-to-job conversion (closed_won trigger)
- `features/line-items/LineItemsTable.tsx` — Shared line items table (live mode)

## Data Flow

- **SWR hook**: `useLeads()` → `GET /api/leads` (paginated, searchable)
- **Stage change**: `PATCH /api/leads` — triggers closed_won modal when appropriate
- **Line items**: `GET/POST/PATCH/DELETE /api/lead-line-items` — auto-recalculates lead value
