# Jobs View

Operations job management — table view with status filters, search, and detailed side sheet.

## Key Components

- `page.tsx` — Job list with status pills, search, pagination, skeleton loading
- `components/sheets/JobSideSheet.tsx` — Detail view with tabs (Details, Products, Projects, Notes, Activity)
- `components/modals/CreateJobModal.tsx` — New job creation with assignee selection
- `features/line-items/LineItemsTable.tsx` — Shared line items table (live mode)
- `features/side-sheets/SideSheetLayout.tsx` — Shared sheet layout

## Data Flow

- **SWR hook**: `useJobs()` → `GET /api/jobs` (paginated, with assignee join mapping)
- **Line items**: `GET/POST/PATCH/DELETE /api/job-line-items` — auto-recalculates job amount
- **Assignees**: Managed via `PATCH /api/jobs` with `assignee_ids` array
- **Job from opportunity**: `POST /api/jobs/from-opportunity` — creates job + line items + projects
