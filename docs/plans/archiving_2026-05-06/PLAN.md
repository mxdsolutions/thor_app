# Archiving across business entities

**Date:** 2026-05-06
**Author:** Calibre Media
**Status:** approved

---

## Goal

Add a uniform archive mechanism to every business entity. Archived rows are
hidden from default list views; users opt back in via the existing status
filter on each page. No hard deletes (already project policy) — archive is the
canonical "remove from view but keep the data" action.

## Scope

In scope (8 tables):

- `jobs`, `quotes`, `invoices`, `reports`
- `contacts`, `companies`
- `pricing` (matrix rows), `products` (services)

Out of scope:

- `leads` — feature was removed; no `leads` table currently exists in the
  database despite the CRM_LEADS route stub. Revisit if leads come back.
- `tasks` — short lifecycle, terminal `cancelled` / `completed` statuses cover
  the same need.
- Cross-tenant platform admin tables (tenants, users) — different lifecycle.

## Approach

### Schema

A nullable `archived_at timestamptz` column on each in-scope table. Default
visible filter is `archived_at IS NULL`. A partial index
`(tenant_id) WHERE archived_at IS NULL` keeps the active-list query path fast
as data accumulates.

One migration: `020_add_archived_at.sql` adds the column + index across all
nine tables.

### API

- Each list `GET` accepts an `archive` query param: `active` (default) |
  `archived` | `all`.
- `app/api/_lib/list-query.ts → tenantListQuery` reads the param and applies
  the filter — individual routes don't have to remember.
- Archive/unarchive is a dedicated endpoint per entity:
  `PATCH /api/{entity}/[id]/archive` with body `{ archived: boolean }`.
  Sets/clears `archived_at`. Keeps the entity's main PATCH schema clean and
  leaves room for a future bulk-archive endpoint.
- Validation: a single shared `archiveSchema = z.object({ archived: z.boolean() })`
  in `lib/validation.ts` reused by every archive endpoint.

### UI

- The existing status `<Select>` on each list page grows three scope options
  at the top, separated from the per-status options by a divider:
  - **Active** (default — selected on page load)
  - **Archived**
  - **All**
- Per-status options (Draft, Accepted, etc.) still filter *within* whichever
  scope is active.
- Side sheets / detail views: an "Archive" action in the kebab menu (or
  alongside Save). Archived rows show a banner: "This {thing} is archived.
  [Restore]".
- Kanban: archived items are excluded — no "Archived" column. Archive action
  removes the card from the board.
- Entity pickers (modals' company/contact/job dropdowns, etc.): archived
  items are filtered out by default. Surfacing them would just produce
  "where did the archived company go?" support tickets when they reappear in
  pickers.

## Key Decisions

1. **`archived_at timestamptz`, not `is_archived boolean`.** Same write cost,
   gets "when was it archived" for free, no separate audit row needed.
2. **Dedicated archive endpoint per entity, not piggy-backed on PATCH.**
   Keeps the entity PATCH schema clean and makes a future bulk endpoint a
   simple addition.
3. **Scope baked into the existing status `<Select>`, not a second filter
   control.** Fewer controls on already-crowded list page headers.
4. **Pricing/services keep their existing `active/expired/suspended` business
   statuses *and* gain `archived_at`.** They're orthogonal — a service can be
   "expired" (no longer offered) while still un-archived (visible for
   historical jobs that referenced it).
5. **`tasks` do not archive.** Short-lived; `completed`/`cancelled` already
   removes them from default views. (`leads` was originally in scope but the
   table no longer exists — feature was removed.)
6. **Permissions: archive is open to any user with write permission on the
   entity.** Archive is reversible, so it doesn't warrant the role gate that
   delete would. (No delete exists today; archive replaces it.)
7. **Archived items hidden from entity pickers everywhere.** Default-hide is
   the surprise-free behavior.

## Phasing

1. **Schema** — single migration, all tables get the column + partial index.
   Low risk, ships first so application code can rely on the column existing.
2. **API helpers + endpoints** — update `tenantListQuery` once, then add
   archive endpoints. Group commits by domain:
   - CRM: contacts, companies, leads
   - Ops: jobs, quotes, invoices, reports
   - Catalog: services, pricing
3. **UI list filters** — wire the Active/Archived/All scope into each list
   page's status filter. After this, archive is fully usable via SQL or API
   and the UI shows it correctly.
4. **UI archive actions** — buttons in side sheets, kanban exclusion, picker
   exclusion. This is the user-facing MVP.

## Open Questions

None blocking — all design decisions resolved with the user on 2026-05-06.

Stretch follow-ups (not part of this plan):

- Bulk archive (multi-select on list pages → archive selected).
- Auto-archive rules (e.g. "auto-archive jobs completed > 12 months ago").
- An "Archive" page per entity (dedicated archived-only view) if the in-line
  filter proves insufficient.
