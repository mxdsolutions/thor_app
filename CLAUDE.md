# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Multi-tenant CRM + operations dashboard.
**Stack:** Next.js 15 (App Router) / React 19 / Supabase / Tailwind v4 / SWR / Zod / Radix UI

---

## Dev Setup

```bash
npm run dev        # starts dev server on localhost:8005
npm run build      # production build
npm run start      # start production server
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
    platform-admin/       # Cross-tenant platform admin API routes
  auth/callback/          # Supabase auth callback
  dashboard/              # Tenant-scoped dashboard (CRM, Operations, Finance, Settings)
  platform-admin/         # Platform admin UI (cross-tenant management)
  onboarding/             # Tenant onboarding flow
components/
  dashboard/              # DashboardPage, DashboardControls, StatCard, ScrollableTableLayout
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
  tenant.ts               # Tenant resolution (getTenantId, getTenantBranding)
  tenant-context.tsx      # Client-side tenant/permission hooks
  swr.ts                  # SWR hooks (useCompanies, useJobs, useContacts, etc.)
  utils.ts                # cn(), formatCurrency(), timeAgo(), getInitials()
  validation.ts           # Zod schemas for all entities
docs/
  audits/                 # Code review audits (see Audits section)
  plans/                  # Plans + task tracking (see Plans section)
```

---

## Key Patterns

### API Routes

All tenant-scoped routes use `withAuth`; platform admin routes use `withPlatformAuth`:

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
- For tenant-scoped GET list routes, prefer `tenantListQuery()` from `_lib/list-query.ts` — it bakes in `.eq("tenant_id", tenantId)`, pagination, ordering, and a search OR clause so the tenant filter can't be forgotten. For routes with complex joins or many filters you can build the query manually, but you **must** still call `.eq("tenant_id", tenantId)` on every SELECT, UPDATE, and DELETE.
- Use `parsePagination()` for GET routes — defaults: limit=50, max=200
- Use `serverError()`, `validationError()`, `notFoundError()`, `missingParamError()` from `_lib/errors.ts` — **never** use inline `NextResponse.json({ error: ... })` for error responses
- Always include `tenant_id` on inserts and `.eq("tenant_id", tenantId)` on updates and deletes — never rely on RLS alone
- **No hard deletes.** All entities use soft-delete via an `archived` / status column. There are no `DELETE` API endpoints for business entities — instead, PATCH the record to an archived state. This preserves data integrity and audit trails. The only exceptions are join-table rows (e.g. `job_assignees`, `quote_sections`) where hard delete is acceptable.

### Platform Admin API Routes

For cross-tenant operations (e.g. managing all tenants, platform-wide stats):

```typescript
import { withPlatformAuth } from "@/app/api/_lib/handler";

export const GET = withPlatformAuth(async (request, { adminClient, user }) => {
  // adminClient bypasses RLS — use for cross-tenant queries
  // No tenantId in context — platform admin operates across all tenants
  const { data, error } = await adminClient.from("tenants").select("*");
  // ...
});
```

- `withPlatformAuth()` provides `{ supabase, user, adminClient }` (no `tenantId`)
- Gates on `user.app_metadata.is_platform_admin === true`
- `adminClient` is a service-role Supabase client that bypasses RLS

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

Page titles display in the global sticky header via context. Controls (search, filters, action buttons) go in a single `DashboardControls` row:

```tsx
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";

export default function ThingsPage() {
    usePageTitle("Things");  // Sets title in global header
    // ...
    return (
        <ScrollableTableLayout
            header={
                <DashboardControls>
                    <div className="flex items-center gap-3">
                        <SearchInput ... />
                        <FilterDropdown ... />
                    </div>
                    <Button onClick={...}>Add Thing</Button>
                </DashboardControls>
            }
        >
            {/* Table or Kanban content */}
        </ScrollableTableLayout>
    );
}
```

**Rules:**
- Always call `usePageTitle("Title")` to set the sticky-header title. List pages also render an inline `<h1 className="font-statement text-2xl font-extrabold tracking-tight">Title</h1>` inside their `header` slot (above the `DashboardControls` row) so the title is visible without the sticky header — keep both in sync
- `DashboardControls` uses `justify-between`: left side = search + filters, right side = action button
- Pages without controls (overview/settings) just call `usePageTitle()` with no `DashboardControls`

### Filters

Table filters (e.g. status) **must use dropdown selects**, not inline pill buttons. Use the Radix `Select` component from `components/ui/select.tsx`:

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

<Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="All">All Statuses</SelectItem>
        <SelectItem value="draft">Draft</SelectItem>
        {/* ... */}
    </SelectContent>
</Select>
```

**Rules:**
- Place dropdowns next to the search input inside `DashboardControls`
- The `SelectTrigger` primitive ships with `rounded-xl border-border/50 h-10` as the default — only override width (`w-[Npx]`) or additional utilities when needed
- First option should be the "All" unfiltered state (e.g. "All Statuses")
- Do **not** use filter pill buttons for status/type filters

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

### Middleware & Tenant Resolution

Middleware (`middleware.ts`) resolves the tenant for every request using three strategies in order:

1. **Custom domain** — looks up `tenants.custom_domain` in Supabase (e.g. `app.clientco.com`)
2. **Subdomain** — extracts the slug from `{slug}.platform.com` and looks up `tenants.slug`
3. **JWT fallback** — reads `app_metadata.active_tenant_id` from the session token

Results are cached in an in-memory `Map` (60s TTL, max 500 entries) with LRU-style eviction when full. Platform domains (`localhost`, `admin.mxdsolutions.com.au`) bypass tenant lookup entirely.

The resolved `tenant_id` and `slug` are stored in `x-tenant-id` / `x-tenant-slug` request headers, which `withAuth()` reads in API routes.

### Tenant & Roles

- Middleware resolves tenant from custom domain → subdomain → JWT claims fallback, with in-memory caching (60s TTL)
- `/platform-admin/*` routes gated by `is_platform_admin` in `app_metadata` (checked via `getUser()`, not JWT claims)
- Server-side: `getTenantId()` from `lib/tenant.ts`
- Client-side: `useTenant()` from `lib/tenant-context.tsx`
- Roles: Owner > Admin > Manager > Member > Viewer (stored on `tenant_memberships.role`)
- **Tenant isolation is enforced two ways:**
  1. **Postgres RLS** — every tenant-scoped table has strict `tenant_id = get_user_tenant_id()` policies. No loose `auth.role() = 'authenticated'` policies are allowed.
  2. **Explicit `.eq("tenant_id", tenantId)` in API routes** — defense-in-depth. Use the `tenantListQuery` helper from `app/api/_lib/list-query.ts` for new GET routes so the filter cannot be forgotten.
- **Role-based permission enforcement:** Client-side hooks (`usePermission()`, `useRole()` in `lib/tenant-context.tsx`) resolve the current user's role and can check permissions. However, **API routes do not yet enforce role-based access consistently** — routes that need to gate by role (e.g. owners only) check `tenant_memberships.role` inline (see `app/api/users/route.ts` for the pattern). Do not invent a `hasPermission()` helper without designing the role/resource map first.

### Server Actions

Server actions live in `app/actions/` for auth and tenant operations:

```typescript
"use server";
import { createClient } from "@/lib/supabase/server";

export async function myAction(formData: FormData) {
  try {
    const supabase = await createClient();
    // ... action logic
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred" };
  }
}
```

**When to use server actions vs API routes:**
- Server actions: auth flows, form submissions, one-off mutations that don't need REST endpoints
- API routes: CRUD operations that SWR hooks consume, integrations, webhooks

### Reusable Components

**`DataTable`** (`components/dashboard/DataTable.tsx`) — Generic typed table for list pages. Handles loading skeletons, empty states, hover-reveal row actions, and responsive column hiding. Use this instead of building raw `<table>` markup:

```tsx
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";

const columns: DataTableColumn<Contact>[] = [
    { key: "name", label: "Name", render: (c) => <span className="font-semibold">{c.first_name} {c.last_name}</span> },
    { key: "email", label: "Email", render: (c) => c.email || "—", muted: true, className: "hidden sm:table-cell" },
];

<DataTable items={contacts} columns={columns} loading={isLoading} onRowClick={setSelected} />
```

**`EntitySearchDropdown`** (`components/ui/entity-search-dropdown.tsx`) — Searchable dropdown with inline "Create new" modal for contact/company/job selection in forms. Use this in modals instead of building custom dropdowns.

**`useFormSubmit`** (`lib/hooks/use-form-submit.ts`) — Hook for modal form submission. Handles saving state, fetch, optional Zod validation, toast notifications, and error handling:

```tsx
const { saving, submit } = useFormSubmit({
    url: "/api/contacts",
    schema: contactSchema,
    onSuccess: (result) => { onCreated?.(result); onOpenChange(false); },
    successMessage: "Contact created",
});
```

### Route Constants

Route paths are defined in `lib/routes.ts` — always import from there instead of using string literals:

```typescript
import { ROUTES } from "@/lib/routes";
router.push(ROUTES.CRM_LEADS);
```

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

- **Tailwind v4** — uses `@theme` block in `globals.css` with CSS variables, not a `tailwind.config` file
- Use `cn()` from `lib/utils` for conditional classes — never inline ternaries in className
- Use Lucide (`lucide-react`) for icons. Import as `import { Foo } from "lucide-react"`. The codebase also still has some `@tabler/icons-react` imports from earlier work — leave those alone unless you're already in the file for another reason.
- **Typography:** body text is IBM Plex Sans (`--font-plex-sans`, wired to `--font-sans`) — chosen for its industrial/engineered character to pair with the Antonio display face. All `h1`–`h6` headings use Antonio (`--font-antonio`, exposed as `--font-display` / `font-display` utility) via a base layer rule — apply heading styles to semantic `<h*>` tags so they pick this up automatically. Non-heading elements styled as headings (e.g. a `<div>` with `text-xl font-bold`) will render in Plex Sans — use `font-display` if you need Antonio on a non-heading. Antonio ships real weights 100–700, so `font-normal`/`font-medium`/`font-semibold`/`font-bold` all work as expected (no synthetic bold). The base layer applies `font-weight: 500` to headings by default. Apply `uppercase` when you want the all-caps display look.
- **Radius scale** (industrial feel, deliberately tight): `rounded-sm`/`rounded-md` → 2px, `rounded-lg` → 6px (buttons/interactive), `rounded-xl`/`rounded-2xl`/`rounded-3xl` → 4px (surfaces). Don't introduce arbitrary values like `rounded-[8px]` — stick to the token scale.
- Buttons: `rounded-lg` (6px) — this is the industrial default. Reserve `rounded-full` for avatars and pill badges only. Cards: `rounded-2xl border bg-card shadow-sm` (renders at 4px per the token override).
- Spacing: `gap-3` between cards, `space-y-6` between sections
- Use design system tokens from `lib/design-system.ts` for tables, typography
- Toasts: `sonner`. Animations: `framer-motion`. Charts: `recharts`. PDFs: `@react-pdf/renderer`

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
- **Run all:** `npx vitest run`
- **Run one file:** `npx vitest run path/to/file.test.ts`
- **Watch mode:** `npx vitest`
- Test files go next to source: `route.test.ts`, `component.test.tsx`

### Manual integration testing (Linear)

For large integration work (Stripe, Xero, Outlook, etc.), discrete frontend test cases that the user runs by hand live as Linear issues — not as a checklist inside a single issue's description. The hierarchy is:

```
Testing (parent issue)
  └── {Integration Name} testing (sub-issue)
        ├── Test case 1 (sub-sub-issue)
        ├── Test case 2 (sub-sub-issue)
        └── ...
```

Each test sub-issue should be self-contained, frontend-verifiable, and have a clear pass/fail outcome with explicit setup steps and expected behaviour. This lets the user track each test independently, comment on specific failures in their own thread, and re-run only the affected scenarios when something changes.

After the core code lands for any new integration, create the corresponding sub-tree under the **Testing** parent issue.

---

## Known Issues

_None at this time._

## Atomic write helpers (migrations 025, 032, 034)

Concurrency-sensitive writes go through Postgres RPCs:

- `allocate_tenant_reference(p_tenant_id)` — returns the next reference id under a row lock. Used by `POST /api/jobs`. Add a call here whenever you introduce a new entity that needs an auto-allocated reference.
- `create_job_with_assignees(p_tenant_id, p_created_by, p_payload, p_assignees)` — atomic job + job_assignees insert. If the assignees insert fails the job rolls back.
- `replace_job_assignees(p_tenant_id, p_job_id, p_assignees)` — atomic delete + reinsert of a job's assignees. Used by `PATCH /api/jobs` so a failed insert can't leave a job with zero assignees.
- `recalc_quote_total(p_quote_id)` / `recalc_purchase_order_total(p_po_id)` — wrapped by `recalcQuoteTotal` / `recalcPurchaseOrderTotal` in `app/api/_lib/line-items.ts`. Always call the helper after mutating line items; never sum totals in JS.
- `claim_seat(p_tenant_id)` — atomic seat allocation for the invite flow. Wraps the count-and-decide check in a transaction-scoped advisory lock so two concurrent invites can't both pass at quota - 1. Used by `app/actions/inviteUser.ts`.

## Subscription / billing semantics

- **Cancellation = read-only until period end.** When a tenant cancels, the webhook flips `tenant_subscriptions.status` to `canceled` but the middleware lock check only locks on `unpaid` / `incomplete_expired`. Existing members keep working until the natural period end; new invites are blocked because `getSeatUsage` treats canceled as "no active subscription". This is intentional — it preserves the soft-cancel UX. Don't change the lock predicate without coordinating with product.
- **Middleware lock-state cache has a 60-second SLA.** [middleware.ts](middleware.ts) caches `getTenantLockState` per-worker for 60s. So a tenant who's just been flipped to `unpaid` by webhook can keep browsing for up to 60s, and a tenant who just paid stays locked for up to 60s. Acceptable for a CRM; flag if business needs sub-minute enforcement.
- **Seat enforcement is server-side and atomic** — go through `claim_seat` (or `getSeatUsage` for read-only display). Don't reimplement the count-and-decide.

## Token storage (third-party OAuth)

Xero (`xero_connections`) and Outlook (`email_connections`) tokens use **optimistic locking on `refresh_token`** to handle concurrent refreshes safely. Pattern in `lib/xero.ts` `getValidXeroToken` and `lib/microsoft-graph.ts` `getValidToken` — copy this shape if adding a new OAuth integration. Tokens are stored plaintext in Postgres (Supabase encrypts at rest at the disk level); application-layer encryption is a known follow-up.

## Email sending

Always treat the recipient list as a suppression-checked surface. `lib/email/resend.ts` `sendReportShareEmail` accepts `supabase` as an optional arg — when provided, it consults `email_suppressions` and throws `EmailAddressSuppressed` for bounced/complained addresses. The Resend webhook at `app/api/webhooks/resend/route.ts` populates that table. New callers should pass `supabase` so reputation-damaged addresses are auto-skipped.
