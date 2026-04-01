# Leads View

CRM lead management — table view with search, pagination, and side sheet detail editing.

## Key Components

- `page.tsx` — Lead list with status filter pills, search, skeleton loading
- `components/sheets/LeadSideSheet.tsx` — Detail view with tabs (Details, Notes, Activity)
- `components/modals/CreateLeadModal.tsx` — New lead creation
- `components/modals/CreateOpportunityFromLeadModal.tsx` — Lead-to-opportunity conversion

## Data Flow

- **SWR hook**: `useLeads()` → `GET /api/leads` (paginated, searchable)
- **Create**: `POST /api/leads`
- **Update**: `PATCH /api/leads`
- **Conversion**: Creates opportunity via `POST /api/opportunities`, links via `PATCH /api/leads`
