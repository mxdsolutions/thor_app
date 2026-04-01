# Settings Views

Tenant administration — users, integrations, branding, roles, domain, and subscription management.

## Sub-views

- **`/users`** — Team member management with invite flow
- **`/integrations`** — Outlook OAuth integration setup
- **`/branding`** — Logo upload, primary color, company name (permission-gated)
- **`/roles`** — Role and permission management (permission-gated)
- **`/domain`** — Custom domain configuration (owner only)
- **`/subscription`** — Plan and billing (owner only)

## Data Flow

- **Users**: `GET /api/users` (memberships + profiles), invite via `app/actions/inviteUser.ts`
- **Tenant**: `GET/PATCH /api/tenant`
- **Integrations**: `/api/integrations/outlook/authorize` → OAuth callback
