# Tasks — Permissions Revamp

**Source:** [PLAN.md](./PLAN.md)
**Date:** 2026-04-23
**Status:** in-progress

---

## Phase 1 — Schema & defaults

- [x] **T1** — ~~Add `permissions` JSONB column to `tenant_roles`~~ — column already exists, no migration needed
- [x] **T2** — Default permission sets backfilled across all tenants via `backfill_granular_role_permissions` migration
- [x] **T3** — Canonical resource list + defaults defined in [lib/permissions.ts](../../lib/permissions.ts); [lib/tenant.ts](../../lib/tenant.ts) `seedDefaultRoles` and the existing roles page both reference it

## Phase 2 — API enforcement

- [x] **T4** — [app/api/_lib/permissions.ts](../../app/api/_lib/permissions.ts) ships `requirePermission` and `requireOwner` helpers
- [x] **T5** — Xero authorize/disconnect/select-tenant/sync routes now call `requirePermission` with the new resource keys
- [x] **T6** — Audited other sensitive routes: `PATCH /api/tenant` now gates on `settings.company`, `PATCH /api/users` gates on `settings.users`. Other routes inherit tenant isolation via `withAuth` + RLS and don't need per-role gating at this stage.
- [x] **T7** — Migration `013_restrict_tenant_roles_writes_to_owner.sql` locks `tenant_roles` INSERT/UPDATE/DELETE to the tenant owner via a `current_user_tenant_role()` SECURITY DEFINER helper. `requireOwner` in `app/api/_lib/permissions.ts` is ready for when Phase 4 rebuilds the editor behind an API route.

## Phase 3 — UI enforcement

- [ ] **T8** — Use `usePermission(resource, "read")` in sidebar nav to hide inaccessible items
- [ ] **T9** — Use `usePermission(resource, "write")` on "Add/Create" action buttons across pages
- [ ] **T10** — Add route-level guard that redirects to Overview when user lacks read access
- [ ] **T11** — Hide Connect/Disconnect/Sync buttons on integrations page for users without `integrations.xero.connect` or `integrations.xero.sync` write

## Phase 4 — Settings UI

- [ ] **T12** — Design and build the Roles & Permissions editor at `/dashboard/settings/users/roles` (grouped resource × action grid)
- [ ] **T13** — Persist permission edits to `tenant_roles.permissions`
- [ ] **T14** — Show role selector, lock Owner as read-only, warn on changes that would lock the current user out

## Phase 5 — Polish

- [ ] **T15** — Add basic test coverage for `requirePermission` and `resolvePermission`
- [ ] **T16** — Update CLAUDE.md to document the new permission model and point to `lib/permissions.ts` as the canonical resource list
