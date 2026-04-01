# Companies View

CRM company management — searchable list with side sheet detail editing.

## Key Components

- `page.tsx` — Company list with search, pagination, status pills
- `components/sheets/CompanySideSheet.tsx` — Detail view
- `components/modals/CreateCompanyModal.tsx` — New company creation

## Data Flow

- **SWR hook**: `useCompanies()` → `GET /api/companies`
- **Create**: `POST /api/companies`
