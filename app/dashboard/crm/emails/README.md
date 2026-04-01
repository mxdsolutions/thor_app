# Emails View

Outlook email integration — folder browsing, search, compose, reply with CRM contact matching.

## Key Components

- `page.tsx` — Folder tabs (Inbox, Sent, Drafts, etc.), email list, search
- `components/sheets/EmailSideSheet.tsx` — Full email view with reply
- `components/modals/ComposeEmailModal.tsx` — New email composition

## Data Flow

- **Fetch**: `GET /api/email/messages` → Microsoft Graph API via `/lib/microsoft-graph.ts`
- **Send**: `POST /api/email/messages/send`
- **Reply**: `POST /api/email/messages/[id]/reply`
- **Contact matching**: Emails are matched against CRM contacts by email address
