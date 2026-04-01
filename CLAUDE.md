# MXD Admin — Agent Guide

Multi-tenant CRM + operations dashboard.
**Stack:** Next.js 15 (App Router) / React 19 / Supabase / Tailwind v4 / SWR / Zod / Radix UI

---

## Dev Setup

```bash
npm run dev        # starts dev server on localhost:3002
npm run build      # production build
npm run lint       # ESLint
```

Env vars live in `.env.local` (never commit this). Supabase project ID: `yhwydcbpgbyevbkvaivk`.

---

## File Structure

```
app/
  (auth)/                 # Auth pages (signup, forgot-password, reset-password)
  actions/                # Server actions (inviteUser, tenantSignup)
  api/
    _lib/                 # Shared API utilities (withAuth, errors, pagination, line-items)
    {entity}/route.ts     # API routes per entity
  auth/callback/          # Supabase auth callback
  dashboard/
    crm/                  # Leads, opportunities, companies, contacts, emails
    operations/           # Jobs, services
    settings/             # Company (branding, domain), roles, subscription
  onboarding/             # Tenant onboarding flow
components/
  dashboard/              # DashboardPage, DashboardHeader, DashboardControls
  modals/                 # Create*Modal components
  sheets/                 # Entity side sheets
  ui/                     # Radix-based UI primitives
features/
  shell/                  # App shell (SignOutDialog, NotificationSheet, nav-config)
  side-sheets/            # SideSheetLayout wrapper
  line-items/             # LineItemsTable (live & draft modes)
lib/
  data/                   # Data fetching utilities
  supabase/               # Client setup (server.ts, client.ts)
  design-system.ts        # Visual tokens (see DESIGN_SYSTEM.md)
  permissions.ts          # Permission checking (hasPermission, roles)
  tenant.ts               # Tenant resolution (getTenantId, getTenantBranding)
  tenant-context.tsx      # Client-side tenant/permission hooks
  swr.ts                  # SWR hooks (useCompanies, useLeads, etc.)
  utils.ts                # cn(), formatCurrency(), timeAgo(), getInitials()
  validation.ts           # Zod schemas for all entities
docs/
  audits/                 # Code review audits (see Audits section)
  plans/                  # Plans + task tracking (see Plans section)
```

---

## Key Patterns

### API Routes

All routes use the shared `withAuth` wrapper and standardised error helpers:

```typescript
import { withAuth } from "@/app/api/_lib/handler";
import { parsePagination } from "@/app/api/_lib/pagination";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { entitySchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase }) => {
  const { limit, offset, search } = parsePagination(request);
  let query = supabase
    .from("table")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (search) query = query.or(`name.ilike.%${search}%`);
  const { data, error, count } = await query;
  if (error) return serverError();
  return NextResponse.json({ items: data, total: count || 0 });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
  const body = await request.json();
  const validation = entitySchema.safeParse(body);
  if (!validation.success) return validationError(validation.error);
  const { data, error } = await supabase
    .from("table")
    .insert({ ...validation.data, created_by: user.id, tenant_id: tenantId })
    .select().single();
  if (error) return serverError();
  return NextResponse.json({ item: data }, { status: 201 });
});
```

**Rules:**
- Always use `withAuth()` — it provides `{ supabase, user, tenantId }`
- Always validate POST/PATCH bodies with Zod schemas from `lib/validation.ts`
- Use `parsePagination()` for GET routes — defaults: limit=50, max=200
- Use `serverError()`, `validationError()`, `notFoundError()` from `_lib/errors.ts`
- Always include `tenant_id` on inserts

### Supabase Clients

```typescript
// Server components & API routes
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Admin/privileged operations (bypasses RLS)
import { createAdminClient } from "@/lib/supabase/server";
const admin = await createAdminClient();

// Client components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

### Validation

Add Zod schemas to `lib/validation.ts`. Export both schema and inferred type:

```typescript
export const thingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // ...
});
export type ThingInput = z.infer<typeof thingSchema>;
```

### SWR Data Hooks

Client-side data fetching uses SWR hooks defined in `lib/swr.ts`:

```typescript
export function useThings() {
  return useSWR("/api/things", fetcher, defaultConfig);
}
```

Add new hooks here when creating new entities. `defaultConfig` disables revalidateOnFocus with 10s deduping.

### Dashboard Pages

Use the modular layout components:

```tsx
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";

<DashboardPage>
  <DashboardHeader title="Things" subtitle="Manage things">
    <Button onClick={...}>Add Thing</Button>
  </DashboardHeader>
  <DashboardControls>
    <SearchInput ... />
  </DashboardControls>
  {/* Table or Kanban content */}
</DashboardPage>
```

### Modals

Pattern for `Create*Modal` components in `components/modals/`:

- `"use client"` component
- Radix `Dialog` for the modal shell
- Form state via `useState` hooks
- Validate with Zod, call API route, show toast via `sonner`, call `onCreated` callback
- Reset form on successful submit

### Side Sheets

Use `SideSheetLayout` from `features/side-sheets/`:

- Wraps Radix `Sheet` with consistent header, tabs, scrollable content
- Props: `open`, `onOpenChange`, `icon`, `iconBg`, `title`, `subtitle`, `badge`, `tabs`, `activeTab`, `onTabChange`
- Standard tabs: Details, Notes, Activity

### Tenant & Permissions

- Middleware resolves tenant from domain/subdomain/JWT → injects `x-tenant-id` header
- Server-side: `getTenantId()` from `lib/tenant.ts`
- Client-side: `useTenant()` and `usePermission()` from `lib/tenant-context.tsx`
- Roles: Owner > Admin > Manager > Member > Viewer
- Check permissions: `hasPermission(userId, tenantId, "crm.leads", "write")`

---

## Creating New Entities (Checklist)

When adding a new entity (e.g. "invoices"):

1. **Schema** — Add Zod schema + type to `lib/validation.ts`
2. **API route** — Create `app/api/invoices/route.ts` using `withAuth`, pagination, validation pattern
3. **SWR hook** — Add `useInvoices()` to `lib/swr.ts`
4. **Dashboard page** — Create `app/dashboard/{section}/invoices/page.tsx` with `DashboardPage` layout
5. **Modal** — Create `components/modals/CreateInvoiceModal.tsx`
6. **Side sheet** — Create `components/sheets/InvoiceSideSheet.tsx` using `SideSheetLayout`
7. **Nav** — Add to nav config in `features/shell/nav-config.ts`

---

## Styling

See `DESIGN_SYSTEM.md` for full tokens. Key rules:

- Use `cn()` from `lib/utils` for conditional classes — never inline ternaries in className
- Use Heroicons (`@heroicons/react/24/outline`) for dashboard icons
- Buttons: `rounded-full`. Cards: `rounded-2xl border bg-card shadow-sm`
- Spacing: `gap-3` between cards, `space-y-6` between sections
- Use design system tokens from `lib/design-system.ts` for tables, typography

---

## Plans & Tasks (`docs/plans/`)

Each plan gets a folder: `docs/plans/{slug}_{YYYY-MM-DD}/`

| File | Purpose |
|------|---------|
| `PLAN.md` | Goal, approach, key decisions |
| `TASKS.md` | Checkbox task list linked to the plan |

**Status lifecycle:** `draft` → `approved` → `in-progress` → `complete` / `abandoned`

See `docs/plans/README.md` for templates and conventions. When starting non-trivial work:

1. Create a plan folder
2. Write PLAN.md with goal and approach
3. Break work into tasks in TASKS.md
4. Update status as work progresses
5. Check off tasks as they're completed

---

## Audits (`docs/audits/`)

Code review audits live in `docs/audits/{slug}_{date}_{status}/`.

Each audit has:
- `AUDIT.md` or `REVIEW.md` — findings grouped by severity
- `TASKS.md` — actionable task list derived from findings

---

## Testing

- **Framework:** Vitest + Testing Library (configured in `vitest.config.ts`)
- **Run:** `npx vitest` or `npx vitest run`
- Test files go next to source: `route.test.ts`, `component.test.tsx`
