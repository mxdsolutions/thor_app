# Contacts View

CRM contact management — searchable list with company associations.

## Key Components

- `page.tsx` — Contact list with search, pagination
- `components/sheets/ContactSideSheet.tsx` — Detail view
- `components/modals/CreateContactModal.tsx` — New contact with company linking

## Data Flow

- **SWR hook**: `useContacts()` → `GET /api/contacts` (joins company)
- **Create**: `POST /api/contacts`
- **Update**: `PATCH /api/contacts`
