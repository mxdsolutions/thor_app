# Platform-admin builder rework — code audit

**Date:** 2026-05-16
**Project type:** Multi-tenant CRM + operations dashboard (THOR: Tradie OS) — Next.js 15 / React 19 / Supabase
**Audit depth:** Standard, 7-dimension code audit per `anthropic-skills:code-audit`
**Scope:** The uncommitted report-template builder rework — `app/platform-admin/builder/`, `components/platform-admin/builder/`, the universal `FormField` renderer, the new `lib/report-templates/{slug,cover-upload,fake-data,preview-pdf}.ts` helpers, the two `report-templates` API routes, `CreateReportTemplateModal`, `TenantSelect`, `lib/validation.ts` template schemas, and migration `044_report_templates_tenant_and_cover.sql`.

**Forward-looking constraint:** the builder lives at `/platform-admin/builder/...` today but is destined to move to `/dashboard/builder/...` so tenant users can build their own templates. Under that future routing, `tenant_id` is implicit from `withAuth`, so the absence of an in-builder tenant picker is intentional and is **not** flagged as a defect.

---

## Executive summary

The rework cleans up a previously busier layout into a flatter shell — sidebar + canvas + top bar + preview-nav — and pulls a coherent set of new helpers into `lib/report-templates/`. The state orchestration in [BuilderShell.tsx](../../../components/platform-admin/builder/BuilderShell.tsx) is well-organised, atomic slug allocation is correct, and `withPlatformAuth` / `withAuth` are used consistently. The schema is well-typed and forward-compatible at the type level (`version: 1` literal). The new `FormField` mode prop unifies wizard / preview / edit through a single shared component — high-leverage reuse done right.

The changeset ships with two issues that need attention before it lands:

1. **A schema-version downgrade that destroys forward-compat data.** When the page loads a template whose `schema.version` is anything other than `1`, it silently substitutes an empty v1 schema — and the next save overwrites the persisted v2 data. There is no v2 today, but this is the kind of trap that hardens into a production data-loss bug the moment v2 ships.
2. **A direct DESIGN_SYSTEM.md violation** — `BuilderTopBar` hand-rolls a segmented control even though `<SegmentedControl>` exists at [components/ui/segmented-control.tsx](../../../components/ui/segmented-control.tsx) and is explicitly mandated ("Do not hand-roll tab UIs"). This is one of three native-element-vs-primitive inconsistencies that, taken together, leave the builder visually drifting from the rest of the app.

There's also a **tenant-isolation defense-in-depth gap** between the middleware (which only sets `x-tenant-id` when it resolves a tenant) and `getTenantId()` (which trusts the header without UUID validation). In today's `/platform-admin/`-only world it's near-zero impact (platform admins have legitimate cross-tenant access anyway), and after the planned `/dashboard/builder/` migration the precondition — a logged-in user with no tenant context resolved — is unreachable in practice because dashboard sessions require tenant resolution to function. Worth fixing for hygiene, not a merge-blocker.

The remaining findings are quality-of-life refactors: a 727-LOC god-component in `BuilderCanvas.tsx`, seven-callback prop drilling, three duplicated definitions of `BuilderTemplateMeta`, duplicated default-schema literals, an index-keyed editable list in the choice editor, and an in-builder ID-dedup-on-save that silently mutates the user's IDs even when the save afterwards fails.

**Severity counts:** 🔴 2 critical · 🟡 13 major · 🟢 17 minor

---

## Top priorities

1. **🔴 Q1 — Schema-version silent downgrade in [page.tsx:64-67](../../../app/platform-admin/builder/[id]/page.tsx:64).** `template.schema && template.schema.version === 1 ? template.schema : { version: 1, sections: [] }` silently substitutes an empty v1 schema for any non-v1 input — and the next save will overwrite the persisted schema with empty data. Surface the version mismatch (load error, banner, refusal) rather than swallow it.
2. **🔴 D1 — Hand-rolled segmented control in [BuilderTopBar.tsx:50-64](../../../components/platform-admin/builder/BuilderTopBar.tsx:50).** DESIGN_SYSTEM.md mandates `<SegmentedControl>` from [components/ui/segmented-control.tsx](../../../components/ui/segmented-control.tsx). Use the primitive.
3. **🟡 M1 — `BuilderCanvas.tsx` is 727 LOC with five inline subcomponents.** Split per the modularity section below; this is the headline refactor that downstream improvements depend on.
4. **🟡 Q4 — `handleSave` mutates IDs before awaiting the save** ([BuilderShell.tsx:282-299](../../../components/platform-admin/builder/BuilderShell.tsx:282)). If the save fails, the user's IDs were already renamed without their consent and the toast is the only signal that anything changed.
5. **🟡 S1 — Tenant-ID header trust gap** ([middleware.ts:225-234](../../../middleware.ts:225), [lib/tenant.ts:38-50](../../../lib/tenant.ts:38), [app/api/report-templates/route.ts:18](../../../app/api/report-templates/route.ts:18)). Defense-in-depth only — see §5 S1 for the deployment-context analysis. Land as hygiene alongside the cleanup batch.

---

## 1. Best Practices

### 🟡 BP1 — ID / slug generation duplicated across four files with separator drift

The same logical operation — "slugify a label into a stable ID, dedup against existing IDs" — is reimplemented in:

- [BuilderShell.tsx:28-43](../../../components/platform-admin/builder/BuilderShell.tsx:28) — `generateSectionId` (uses `_`), `deduplicateFieldId` (uses `_${n}`)
- [BuilderCanvas.tsx:62-68](../../../components/platform-admin/builder/BuilderCanvas.tsx:62) — `dedupedFieldId` (local closure copy of the above)
- [BuilderCanvas.tsx:666-668](../../../components/platform-admin/builder/BuilderCanvas.tsx:666) — `slugify` (uses `_`, for choice values)
- [CreateReportTemplateModal.tsx:48-55](../../../components/modals/CreateReportTemplateModal.tsx:48) — `handleSlugify` (uses `-`, for template slugs)

The slug regex enforced by [lib/validation.ts:306](../../../lib/validation.ts:306) is `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/` — hyphens only, no underscores. So the four implementations split into two camps that produce mutually incompatible identifiers. A user-typed slug copied verbatim from a section ID would fail validation.

**Fix:** extract a single `lib/report-templates/ids.ts` with two named exports: `slugifyHyphen(s)` for template slugs (matches validation regex) and `slugifyUnderscore(s)` / `dedupeId(id, existing)` for field/section IDs. Import from all four call sites.

### 🟢 BP2 — Schema-version literal `=== 1` assumed in three places

Beyond the silent downgrade in `page.tsx` (Q1 above), the literal `version: 1` appears at:

- [BuilderShell.tsx:71](../../../components/platform-admin/builder/BuilderShell.tsx:71) (`buildStarterSection`)
- [app/api/platform-admin/report-templates/route.ts:38](../../../app/api/platform-admin/report-templates/route.ts:38) (`defaultSchema`)
- [app/api/report-templates/route.ts:40](../../../app/api/report-templates/route.ts:40) (`defaultSchema`)
- [lib/validation.ts:288](../../../lib/validation.ts:288) (`z.literal(1)`)

The runtime assumption is correct today (only v1 exists), but the literal is sprinkled across files that will all need to change together for v2. Centralise in `lib/report-templates/defaults.ts` and re-export a `LATEST_SCHEMA_VERSION` constant.

### 🟢 BP3 — `pgUuid` regex documentation is excellent — verify scope

[lib/validation.ts:296-299](../../../lib/validation.ts:296) intentionally bypasses Zod's `.uuid()` to accept seed/nil UUIDs. The comment explains the trade-off well. Used at `:310` (create), `:321` (update). Both are tenant IDs from trusted server-context or admin-selected dropdown, so the relaxation is fine. Keep the comment if it's ever copied to a user-supplied input path.

### 🟢 BP4 — `document.title` patched via `useEffect`

[page.tsx:15-19](../../../app/platform-admin/builder/[id]/page.tsx:15) patches `document.title` in a `useEffect` instead of using Next.js metadata. The rest of the app uses route-level metadata. Move to `generateMetadata` (server component) or `metadata` export if the page is converted. Low priority.

### 🟢 Strength — Atomic slug allocation done right

[lib/report-templates/slug.ts](../../../lib/report-templates/slug.ts) uses the unique-constraint-as-arbiter pattern: each attempt is its own INSERT, no pre-check window. Mirrors `allocate_tenant_reference` and other concurrency-safe helpers documented in CLAUDE.md. Worth keeping as the reference implementation for future "insert with retried slug" needs.

---

## 2. Modularity

### 🟡 M1 — `BuilderCanvas.tsx` is a 727-LOC god-component

[BuilderCanvas.tsx](../../../components/platform-admin/builder/BuilderCanvas.tsx) hosts six distinct concerns in one file: the canvas wrapper, `PageContent` (the section + grid layout), `FieldCell` (per-field activation + edit chrome), `FieldToolbar` (type/required/width/move/dup/delete), `SectionSettings` (repeater popover), `AddQuestionRow` (question-type picker), and `ChoiceListEditor` (inline select-option editor). Each already has its own typed props interface — they pay the cost of a separate component without the testability or reuse benefits.

The internal section-banner comments at [:127, :284, :378, :478, :574, :662](../../../components/platform-admin/builder/BuilderCanvas.tsx:127) document the split clearly — they're effectively a "split me along these lines" annotation.

**Fix:** extract under `components/platform-admin/builder/canvas/`:

```
canvas/
  BuilderCanvas.tsx        (~110 LOC — public export, animation wrapper)
  PageContent.tsx          (~140 LOC)
  FieldCell.tsx            (~90 LOC)
  FieldToolbar.tsx         (~95 LOC)
  SectionSettings.tsx      (~80 LOC)
  AddQuestionRow.tsx       (~90 LOC)
  ChoiceListEditor.tsx     (~70 LOC)
```

This is the headline modularity finding and unlocks M2, A1, and arguably the choice-editor key fix (Q2).

### 🟡 M2 — Seven-callback prop drilling through four layers

`BuilderShell → BuilderCanvas → PageContent → FieldCell` passes seven field-action callbacks: `onUpdateSection`, `onDeleteSection`, `onAddField`, `onUpdateField`, `onDeleteField`, `onMoveField`, `onDuplicateField`. Each layer re-prepends `sectionIndex` and `fieldIndex`. Adding an eighth (e.g. "toggle help text") forces edits in three files.

**Fix:** a `BuilderContext` provider scoped to the active page, exposing a stable `{ actions, schema }` object. `FieldCell` consumes `useBuilderActions(sectionIndex)` and receives index-prepended callbacks directly. Cleanest done at the same time as M1.

### 🟡 M3 — `CoverUploader` inlined inside `BuilderSidebar`

[BuilderSidebar.tsx:243-362](../../../components/platform-admin/builder/BuilderSidebar.tsx:243) holds a 120-LOC `CoverUploader` subcomponent that owns its own upload state, talks to Supabase storage, and handles three visual states. It belongs next to its data-layer counterpart, [lib/report-templates/cover-upload.ts](../../../lib/report-templates/cover-upload.ts). Once it moves, the `CreateReportTemplateModal` could reuse it during template creation (cover upload is currently only available after first save).

**Fix:** extract to `components/platform-admin/builder/CoverUploader.tsx`. Approx 100 LOC own file.

### 🟢 M4 — `fetchTenantBranding` is a fetch helper masquerading as a closure

[BuilderShell.tsx:363-383](../../../components/platform-admin/builder/BuilderShell.tsx:363) defines `fetchTenantBranding` at module scope but the function is a generic "GET /api/platform-admin/tenants/:id and pull branding fields" helper. Belongs in `lib/api/platform-tenants.ts` (or similar) so other parts of the platform admin surface can reuse the same shape.

---

## 3. Code Quality & Cleanliness

### 🔴 Q1 — Schema-version silent downgrade (data loss)

Covered in Top Priorities. [page.tsx:64-67](../../../app/platform-admin/builder/[id]/page.tsx:64):

```ts
const schema: TemplateSchema =
    template.schema && template.schema.version === 1
        ? template.schema
        : { version: 1, sections: [] };
```

The future v2 case: a template stored with `schema.version === 2` (perhaps written by a future deployment, or by a manual SQL fix) loads into the builder as an empty v1 schema. The user sees no warning, makes a small edit, hits Save, and the PATCH at [page.tsx:31-42](../../../app/platform-admin/builder/[id]/page.tsx:31) overwrites the v2 schema with the empty v1 one. There is no audit/version-history table for templates that would let the user recover.

**Fix options, in order of preference:**

1. Hard-fail the page render with a clear "This template was saved by a newer version of the app — please update or contact support" message.
2. Refuse to render the builder but show a read-only JSON view so the user can copy out their work.
3. Branch on version and call a `migrateV2ToV1` (or vice versa) helper if/when v2 exists.

The minimum acceptable bar is *don't silently substitute empty data*.

### 🟡 Q2 — Index-based React keys in `ChoiceListEditor`

[BuilderCanvas.tsx:684-715](../../../components/platform-admin/builder/BuilderCanvas.tsx:684) renders the choice list with `key={i}`. If the user deletes or reorders a choice, React reuses the input DOM nodes but binds them to different `options[i]`, which (a) drops focus mid-edit and (b) can briefly show stale text while the controlled `value` prop catches up. The classic anti-pattern; user-visible.

**Fix:** generate a stable per-choice id on creation (`crypto.randomUUID()` is fine for a client-only id, or `${Date.now()}-${i}` if you want to avoid deps). The `value` field is *not* a safe key because users can edit it to empty during typing.

### 🟡 Q3 — `makeDefaultField` returns an overly narrow ad-hoc type

[question-types.ts:53](../../../components/platform-admin/builder/question-types.ts:53):

```ts
export function makeDefaultField(type: FieldType): { label: string; id: string; type: FieldType; required: false; width: "full"; options?: ... }
```

The literal `required: false` and `width: "full"` types force every consumer to cast (`const newField: FieldDef = { ...draft, id: finalId }` at [BuilderCanvas.tsx:78](../../../components/platform-admin/builder/BuilderCanvas.tsx:78)). The magic `id: "new_question"` (line 56) is also a code smell — the dedup logic always fires, but the value-as-literal is misleading.

**Fix:** declare `function makeDefaultField(type: FieldType): FieldDef` and let the inferred shape widen. Optionally generate a non-literal placeholder id (`__pending__`) so the contract is "always replace before render".

### 🟡 Q4 — `handleSave` dedups IDs *before* awaiting the save

[BuilderShell.tsx:282-299](../../../components/platform-admin/builder/BuilderShell.tsx:282):

```ts
const { schema: dedupedSchema, renamed } = dedupeSchemaIds(schema);
if (renamed > 0) {
    setSchema(dedupedSchema);
    toast.warning(`${renamed} duplicate ID${renamed === 1 ? "" : "s"} renamed to prevent conflicts`);
}
await onSave(dedupedSchema, meta);
```

If `onSave` throws, the user has been silently rebranded with new IDs that no longer match the persisted state — and `hasChanges` is never reset, so the next save attempt re-issues the same dedup. The toast is the only signal that anything mutated.

**Fix options:**

1. Dedup *in memory only* for the save payload, but don't `setSchema(dedupedSchema)` until the save succeeds.
2. Show an explicit "we'll rename these IDs to save — proceed?" confirmation before mutating.
3. Track the rename map and offer an undo.

(1) is the smallest change and matches the principle of "don't mutate user data until persistence succeeds".

### 🟢 Q5 — `updateSections` marks dirty on no-op reorder

[BuilderShell.tsx:91-97, 167-179](../../../components/platform-admin/builder/BuilderShell.tsx:91): every `setSchema` triggers `markChanged()`. A drag that drops into the same slot still hits `handleReorderSections` and dirties the page. Minor UX nit (Save button enables erroneously). Compare incoming `newSections` against `prev.sections` before marking.

### 🟢 Q6 — `handleDeleteSection` page-clamp uses stale length

[BuilderShell.tsx:147-156](../../../components/platform-admin/builder/BuilderShell.tsx:147): the `setPage` updater closes over the pre-delete `schema.sections.length`. Works today because the single-delete case is consistent, but if the API ever grows multi-delete or undo it'll silently desync. Derive the post-update length inside the functional updater.

### 🟢 Q7 — `Date.now()` as section-id fallback

[BuilderShell.tsx:34](../../../components/platform-admin/builder/BuilderShell.tsx:34): `... || \`section_${Date.now()}\`` — two rapid empty-title sections in the same millisecond would collide. Dedup catches it, but a counter or `crypto.randomUUID()` is cleaner.

### 🟢 Q8 — Slug-retry returns a duck-typed error object

[slug.ts:30-37](../../../lib/report-templates/slug.ts:30) returns `{ data: null, error: { code: "SLUG_EXHAUSTED", message } as const }` from the `maxAttempts` exhaustion path. Verified safe with [errors.ts:21-29](../../../app/api/_lib/errors.ts:21) — `serverError(cause)` only does `console.error(..., cause)` and returns a generic 500, never accesses `.details` or `.hint`. So the duck-typing works today, but a typed `class SlugExhaustedError extends Error` would be cleaner and surface in error logs as a distinct event.

### 🟢 Q9 — `as Parameters<typeof ReportPDF>[0]["report"]` cast

[preview-pdf.ts:67, 85](../../../lib/report-templates/preview-pdf.ts:67) sidesteps `ReportPDF` prop-shape drift. If `ReportPDF` adds a required prop, the cast keeps compiling and the preview silently breaks at runtime. Replace with an exported `ReportPDFProps` type and a typed adapter.

---

## 4. User Experience

### 🟡 U1 — Mode toggle is centred-absolutely; overlaps left/right at narrow widths

[BuilderTopBar.tsx:48-64](../../../components/platform-admin/builder/BuilderTopBar.tsx:48) uses `pointer-events-none absolute inset-0` to centre the segmented control over the whole top bar. The left ("Templates ↩") and right ("Preview as PDF · status · Save") clusters can overlap the centred control on viewports narrower than ~900px. Recommended fix lands naturally with D1 — the `SegmentedControl` primitive can live in a normal flex slot. If centring across the row is essential, gate `position: absolute` behind a min-width media query.

### 🟢 U2 — "Assign a tenant first" cover-upload gate is transitional

[BuilderSidebar.tsx:279-285](../../../components/platform-admin/builder/BuilderSidebar.tsx:279) shows the placeholder when `meta.tenant_id` is null. Correct for today's platform-admin flow (where create order is "make template → assign tenant later"), but the branch becomes dead code once the builder moves to `/dashboard/builder/...` where `tenant_id` is always implicit. Mark for removal in the `/dashboard` migration.

### 🟢 U3 — Disabled-Submit feedback is a native `title` tooltip only

[PreviewWizardNav.tsx:46-49](../../../components/platform-admin/builder/PreviewWizardNav.tsx:46): the disabled Submit button uses `title="Submit is disabled in preview"`. Native tooltips don't surface on keyboard focus, on touch, or for screen-reader users. A visible "Preview only" helper line below the button is clearer.

### 🟢 U4 — `AddQuestionRow` doesn't close on outside-click

[BuilderCanvas.tsx:583-660](../../../components/platform-admin/builder/BuilderCanvas.tsx:583): only the explicit "Cancel" button closes the picker. Wrap in `Popover` or add an outside-click effect.

### 🟢 U5 — `autoFocus` only on add, not on duplicate

[BuilderCanvas.tsx:75-81, 231-248](../../../components/platform-admin/builder/BuilderCanvas.tsx:75) tracks `justAddedFieldId` for newly-added questions only. Duplicating a field (`handleDuplicateField` in BuilderShell) doesn't set `justAddedFieldId`, so the user has to scroll/find the copy. Set `justAddedFieldId` on duplicate too — the duplicated label "Question (copy)" is the most likely thing to want renamed.

### 🟢 U6 — No keyboard shortcuts for a power-user surface

`⌘S` for save, `⌘E`/`⌘P` for edit/preview toggle, `⌘↵` for add-section would all be at home in a builder. Optional but expected.

### 🟢 Strength — Mode toggle, dirty-state pill, and PDF preview button are tidy

The save-status indicator at [BuilderTopBar.tsx:81-89](../../../components/platform-admin/builder/BuilderTopBar.tsx:81) (amber dot → "Unsaved" / amber → "Saving…" / emerald → "Saved") is clear at-a-glance feedback. The PDF preview is correctly disabled with a spinner during generation. Keep.

---

## 5. Code Structure

### 🟡 S1 — Tenant-ID header trust gap (defense-in-depth)

The mechanism:

- [middleware.ts:225-234](../../../middleware.ts:225) only enters `request.headers.set('x-tenant-id', tenantId)` inside `if (tenantId) { ... }`. When the three resolution paths (custom domain, subdomain, JWT `active_tenant_id`) all return null, an inbound `x-tenant-id` from the client passes through unmodified.
- [lib/tenant.ts:38-50](../../../lib/tenant.ts:38) reads `headers().get("x-tenant-id")` and returns it directly. No UUID validation, no source attestation.
- [app/api/_lib/handler.ts:35](../../../app/api/_lib/handler.ts:35) `withAuth` passes that value into the handler's `tenantId` arg.
- [app/api/report-templates/route.ts:18](../../../app/api/report-templates/route.ts:18) interpolates it into a PostgREST `or(\`tenant_id.eq.${tenantId},tenant_id.is.null\`)` string. The route uses `createAdminClient()` at [route.ts:9, 37](../../../app/api/report-templates/route.ts:9), which bypasses RLS, so the SQL-layer safety net is also gone.

**Practical risk — calibrated by deployment context:**

| Surface | Risk | Why |
|---------|------|-----|
| **Today — `/platform-admin/` only** | Near-zero | The only users who can reach the builder are platform admins, who already have legitimate cross-tenant access via `withPlatformAuth` routes. Spoofing `x-tenant-id` on `/api/report-templates` returns data they could fetch through the front door. |
| **Tomorrow — `/dashboard/builder/`** | Effectively unreachable | Regular tenant users on `/dashboard/*` always have a tenant context resolved (custom domain, subdomain, or `active_tenant_id` JWT claim) — otherwise downstream dashboard pages fail. The precondition "authenticated user with no tenant resolved" doesn't occur on the legitimate dashboard flow. |

So the issue is hygiene rather than urgency. The exploit is real on paper but blocked by deployment shape in both the current and planned worlds. Still worth fixing because (a) we shouldn't rely on the deployment shape, (b) the comma-separated `or()` syntax means a payload like `<uuid>),another.eq.foo--` could theoretically smuggle additional filters if anyone ever loosens the chain.

**Fix (do all three, but not as a merge blocker):**

1. **Middleware always overwrites `x-tenant-id`**, even when no tenant resolves — set to empty string or call `request.headers.delete('x-tenant-id')` outside the `if`.
2. **`getTenantId()` UUID-validates** the header before returning — use the same `pgUuid` regex from [lib/validation.ts:296-299](../../../lib/validation.ts:296) (already documented to accept the seed/nil shapes Postgres permits).
3. **`/api/report-templates` uses `tenantListQuery`** from [app/api/_lib/list-query.ts](../../../app/api/_lib/list-query.ts) (per CLAUDE.md house style) so the tenant filter can't be interpolated.

This isn't strictly a "builder" finding, but the builder is the changeset that introduces the new tenant-scoped route, so it's the right moment to land the fix.

### 🟡 S2 — `BuilderTemplateMeta` shape duplicated three times

- [BuilderShell.tsx:13-19](../../../components/platform-admin/builder/BuilderShell.tsx:13) exports `BuilderTemplateMeta`.
- [BuilderSidebar.tsx:23-41](../../../components/platform-admin/builder/BuilderSidebar.tsx:23) inlines an anonymous copy in its props type AND a second copy in `onUpdateMeta`'s `Partial<...>` signature.
- [page.tsx:22-29](../../../app/platform-admin/builder/[id]/page.tsx:22) inlines a third copy in `handleSave`'s `meta` parameter.

**Fix:** consume `import type { BuilderTemplateMeta }` in both `BuilderSidebar` and `page.tsx`. Add `Partial<BuilderTemplateMeta>` to the sidebar props.

### 🟡 S3 — `CanvasMode` layering is inverted

[BuilderCanvas.tsx:27](../../../components/platform-admin/builder/BuilderCanvas.tsx:27) exports `CanvasMode` but it's consumed by [BuilderShell.tsx:8](../../../components/platform-admin/builder/BuilderShell.tsx:8) and [BuilderTopBar.tsx:13](../../../components/platform-admin/builder/BuilderTopBar.tsx:13) — both architecturally above `BuilderCanvas`. The canvas owns the type that its parents use to configure it.

**Fix:** move `CanvasMode` to a sibling `types.ts` (or extend `question-types.ts` and rename to `types.ts`) that all three import from. Trivial.

### 🟡 S4 — Default starter schema duplicated three times

The literal `{ version: 1, sections: [{ id: "section_1", title: "Section 1", type: "standard", fields: [] }] }` lives at:

- [app/api/platform-admin/report-templates/route.ts:37-47](../../../app/api/platform-admin/report-templates/route.ts:37)
- [app/api/report-templates/route.ts:39-49](../../../app/api/report-templates/route.ts:39)
- [BuilderShell.tsx:70-72](../../../components/platform-admin/builder/BuilderShell.tsx:70) (`buildStarterSection`)

**Fix:** extract to `lib/report-templates/defaults.ts` as `EMPTY_TEMPLATE_SCHEMA` and `buildStarterSection()`. Bonus: cross-cuts BP2.

### 🟢 S5 — `question-types.ts` mixes UI metadata with a factory

[components/platform-admin/builder/question-types.ts](../../../components/platform-admin/builder/question-types.ts) contains both icon/label metadata (`QUESTION_TYPE_META`) and a factory (`makeDefaultField`). Splitting metadata from factory would let the wizard or `FormField` import icon mapping without dragging the factory along.

### 🟢 Strength — `withPlatformAuth` / `withAuth` boundary discipline

All four API routes in scope correctly use the right wrapper, and the tenant-scoped POST at [route.ts:32-58](../../../app/api/report-templates/route.ts:32) explicitly overrides the request body's `tenant_id` with `tenantId` from auth context. `reportTemplateTenantCreateSchema` literally `.omit({ tenant_id: true })` to make the contract impossible to misuse. Excellent defence-in-depth at this layer.

---

## 6. Agent Friendliness

### 🟡 A1 — 727-LOC `BuilderCanvas.tsx` exceeds comfortable file-context

Cross-cuts M1. An agent editing `FieldToolbar` has to load the entire file. Splitting per M1 fixes this directly.

### 🟢 A2 — Section-banner comments in BuilderCanvas are exemplary

The `/* ----- */` banners at [BuilderCanvas.tsx:127, 284, 378, 478, 574, 662](../../../components/platform-admin/builder/BuilderCanvas.tsx:127) are extremely helpful for skimming. Apply the same pattern to [BuilderShell.tsx](../../../components/platform-admin/builder/BuilderShell.tsx) (currently long and unbannered — useful divisions are "section ops", "field ops", "meta", "preview", "save"). Positive note.

### 🟢 A3 — No JSDoc on `BuilderShell`'s exported function or `onSave` semantics

[BuilderShell.tsx:74-79](../../../components/platform-admin/builder/BuilderShell.tsx:74) has a bare interface. Document: is `onSave` allowed to throw? Is it safe to call concurrently? Does it own toast notifications or does the shell? The shell currently shows its own success toast at [page.tsx:44](../../../app/platform-admin/builder/[id]/page.tsx:44) AND error toast at [BuilderShell.tsx:295](../../../components/platform-admin/builder/BuilderShell.tsx:295) — both fire on success/failure, so the contract is "throw on failure, don't double-toast". Worth a one-liner.

### 🟢 A4 — Magic strings: `"section_1"`, `"new_question"`, `"Sample tenant"`, `"preview"`

[BuilderShell.tsx:71](../../../components/platform-admin/builder/BuilderShell.tsx:71), [question-types.ts:56](../../../components/platform-admin/builder/question-types.ts:56), [preview-pdf.ts:60-71](../../../lib/report-templates/preview-pdf.ts:60). Lifting these into named constants (`STARTER_SECTION_ID`, `PENDING_FIELD_ID`, `PREVIEW_TENANT_NAME`) makes them greppable and signals "this is reused or matters".

### 🟢 Strength — `PreviewWizardNav` documents its mirror relationship

The [PreviewWizardNav.tsx:17-23](../../../components/platform-admin/builder/PreviewWizardNav.tsx:17) doc-comment explicitly calls out that it mirrors `components/reports/wizard/WizardStepContent.tsx`. Future agents will know to keep them in sync. Apply the same "mirrors X at /r exactly" comment style to [BuilderCanvas.tsx:127-133](../../../components/platform-admin/builder/BuilderCanvas.tsx:127) (which already notes "matches FormSection in borderless mode") — already partly there, keep it up.

---

## 7. Design System Integrity

### 🔴 D1 — Hand-rolled segmented control in `BuilderTopBar`

Covered in Top Priorities. [BuilderTopBar.tsx:50-64, 109-124](../../../components/platform-admin/builder/BuilderTopBar.tsx:50) defines a local `ModeButton` and wires it into a hand-rolled flex container. DESIGN_SYSTEM.md explicitly states:

> **`<SegmentedControl>`** (`@/components/ui/segmented-control`): Shared component for tab switchers. Do not hand-roll tab UIs.

[components/ui/segmented-control.tsx](../../../components/ui/segmented-control.tsx) is a generic typed component — `SegmentedControl<"edit" | "preview">` slots directly in.

### 🟡 D2 — Native `<select>` / `<textarea>` instead of design-system primitives

DESIGN_SYSTEM.md mandates the Radix `Select` primitive from [components/ui/select.tsx](../../../components/ui/select.tsx) for category/status/type filters, and a `Textarea` primitive exists at [components/ui/textarea.tsx](../../../components/ui/textarea.tsx). Eight sites in scope use native elements with hand-mimicked classes instead:

| Site | Element |
|------|---------|
| [BuilderSidebar.tsx:66-71](../../../components/platform-admin/builder/BuilderSidebar.tsx:66) | native `<input>` (name) |
| [BuilderSidebar.tsx:75-86](../../../components/platform-admin/builder/BuilderSidebar.tsx:75) | native `<select>` (category) |
| [BuilderSidebar.tsx:90-96](../../../components/platform-admin/builder/BuilderSidebar.tsx:90) | native `<textarea>` (description) |
| [BuilderCanvas.tsx:172-177](../../../components/platform-admin/builder/BuilderCanvas.tsx:172) | native `<input>` (section title — intentional borderless feel, see strength below) |
| [BuilderCanvas.tsx:403-414](../../../components/platform-admin/builder/BuilderCanvas.tsx:403) | native `<select>` (question type) |
| [BuilderCanvas.tsx:687-714](../../../components/platform-admin/builder/BuilderCanvas.tsx:687) | native `<input>` (choice editor) |
| [CreateReportTemplateModal.tsx:145-154](../../../components/modals/CreateReportTemplateModal.tsx:145) | native `<select>` (category) |
| [CreateReportTemplateModal.tsx:173-179](../../../components/modals/CreateReportTemplateModal.tsx:173) | native `<textarea>` (description) |
| [TenantSelect.tsx:41-57](../../../components/platform-admin/TenantSelect.tsx:41) | native `<select>` |
| [FormField.tsx:97-105](../../../components/reports/FormField.tsx:97) | native `<textarea>` (renderer used by wizard + PDF) |
| [FormField.tsx:167-179](../../../components/reports/FormField.tsx:167) | native `<select>` (renderer used by wizard + PDF) |

The `FormField` ones are highest-leverage — they're consumed by the wizard at `/r/[token]` and by `ReportPDF`. The category dropdowns in `BuilderSidebar` and `CreateReportTemplateModal` are the closest match to the DESIGN_SYSTEM.md "filters MUST use `Select`" rule.

**Fix:** swap to `Select` / `Textarea` from `components/ui/`. Some surfaces (the inline `<input>` for section title at canvas:172) are intentionally borderless for in-place editing — those can stay native but should pull a `InlineEditableInput` primitive out of [FormField.tsx:376-398](../../../components/reports/FormField.tsx:376) (which already has one) so they share the styling.

### 🟡 D3 — Duplicated Tailwind class string for "rounded-xl bordered input"

The exact string `"flex h-9 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (or near-identical) appears at [BuilderSidebar.tsx:70, 78, 95](../../../components/platform-admin/builder/BuilderSidebar.tsx:70), [TenantSelect.tsx:46-47](../../../components/platform-admin/TenantSelect.tsx:46), and the `flex h-10 w-full rounded-xl border border-input ...` variant at [CreateReportTemplateModal.tsx:148, 178](../../../components/modals/CreateReportTemplateModal.tsx:148) and [FormField.tsx:104, 173](../../../components/reports/FormField.tsx:104).

Adopting the `Input` / `Select` / `Textarea` primitives (D2) eliminates this. If a primitive isn't available for a niche case (e.g. the inline borderless input), extract a constant in `lib/design-system.ts`.

### 🟡 D4 — DESIGN_SYSTEM.md is stale — references a deleted file

[DESIGN_SYSTEM.md:164](../../../DESIGN_SYSTEM.md:164) cites `components/platform-admin/builder/BuilderPreviewCanvas.tsx` as the one documented exception for `rounded-[2rem]`. That file was deleted in this changeset. Either restore the doc to neutral language ("the device-frame mockup, wherever it lives") or remove the exception entirely if the device-frame no longer exists.

### 🟢 D5 — Magic font sizes — actually sanctioned

The 30+ uses of `text-[10px]` / `text-[11px]` / `text-[9px]` across the builder *are* documented in DESIGN_SYSTEM.md's type scale ([:29-44](../../../DESIGN_SYSTEM.md:29)). So this is *not* a violation. However, the design-system *tokenised* classes (`metaClass` = `text-[10px] text-muted-foreground`, `sectionLabelSoftClass` = `text-xs font-semibold uppercase tracking-wider text-muted-foreground/60`, `statLabelClass` = `text-[11px] font-medium uppercase ...`) exist and would let the builder match other dashboard surfaces without thinking about it. Use the tokens where the intent matches.

### 🟢 D6 — Hard-coded reds/greens — also sanctioned, but should centralise

The `text-red-500` / `bg-red-500/5` for destructive buttons and `bg-emerald-400` / `bg-amber-400` for save-status dots used in [BuilderCanvas.tsx:469, 562-563, 712](../../../components/platform-admin/builder/BuilderCanvas.tsx:469), [BuilderSidebar.tsx:326-327](../../../components/platform-admin/builder/BuilderSidebar.tsx:326), [BuilderTopBar.tsx:84-85](../../../components/platform-admin/builder/BuilderTopBar.tsx:84) are explicitly sanctioned by DESIGN_SYSTEM.md (status colors stay literal for semantic clarity). But DESIGN_SYSTEM.md goes on to centralise these in `lib/design-system.ts` (e.g. `jobStatusDotClass`). A `saveStatusDotClass` and `destructiveTextClass` exported there would let the builder match other dashboards.

### 🟢 Strength — `BuilderSidebar` uses `Reorder.Group` with proper drag-handle gating

[BuilderSidebar.tsx:113-128, 371-422](../../../components/platform-admin/builder/BuilderSidebar.tsx:113) uses `framer-motion`'s `Reorder` with `dragListener={false}` and `dragControls={controls}`, so only the grip-handle starts a drag. Combined with `touchAction: "none"`, this correctly preserves both row-click navigation and touch-device scrolling. Reference implementation for any future draggable list.

---

## Cross-cutting findings

### High-risk hypotheses — verification status

| ID | Hypothesis | Verdict |
|----|------------|---------|
| H1 | Tenant-ID header trust gap | **Confirmed 🟡** → S1 (calibrated down from initial 🔴 once deployment context was factored in — see §5 S1) |
| H2 | `tenant-assets` storage RLS — see below | Out of code-audit scope, but `grep` of `supabase/migrations/` for `tenant-assets` returns no policy file. **Verify externally before this ships to tenant users** under `/dashboard/builder`. |
| H3 | `FormField` mode prop drift | **Mostly safe, minor drift.** `inputsReadOnly` predicate is unified at [FormField.tsx:47](../../../components/reports/FormField.tsx:47); `yes_no` and `checkbox` explicitly guard `onChange` with `!inputsReadOnly`; `select` uses `disabled` with `disabled:opacity-100 disabled:cursor-default` (intentional — keeps visual identical in preview); `text/textarea/number/currency/date` use `readOnly` which blocks user typing but not programmatic `.value=`. The three approaches drift but no exploitable leak; pick one (recommend explicit guard on `onChange` for consistency). Not promoted to a top-level finding. |
| H4 | Slug-retry error shape crashes `serverError()` | **Refuted.** `serverError(cause)` at [errors.ts:21-29](../../../app/api/_lib/errors.ts:21) only calls `console.error(..., cause)`. Q8 above captures the residual style issue. |

### Mode-prop overloading: `CanvasMode` ≠ `FormFieldMode`

[BuilderCanvas.tsx:27](../../../components/platform-admin/builder/BuilderCanvas.tsx:27) defines `CanvasMode = "edit" | "preview"` and [FormField.tsx:12](../../../components/reports/FormField.tsx:12) defines `FormFieldMode = "fill" | "preview" | "edit"`. The word `"preview"` means different things in each: in `CanvasMode` it means "wizard-style preview of the builder", in `FormFieldMode` it means "read-only display, no editing affordances". Both are passed as a `mode` prop in their respective component trees, and [FieldCell at BuilderCanvas.tsx:360](../../../components/platform-admin/builder/BuilderCanvas.tsx:360) translates between them with `mode={isEdit ? "edit" : "preview"}` — which works because the canvas's "preview" maps to FormField's "preview", but the overload is confusing. Either rename `CanvasMode` to `{ "edit" | "form-preview" }` or document the equivalence at the call site.

### Cover-merge dynamic-import failure mode

[preview-pdf.ts:88-111](../../../lib/report-templates/preview-pdf.ts:88) puts the `pdf-lib` dynamic import, the cover-fetch, and the content-bytes read into one `Promise.all`. If `pdf-lib` fails to load (network error fetching the chunk), the same `catch` fires that handles a cover-fetch failure — both demote to the same toast ("Couldn't prepend PDF cover"). Acceptable, but the user can't tell whether to retry or report a bug. Distinguish by wrapping just the import in its own try.

### `/dashboard/builder` migration readiness

The future move to `/dashboard/builder/[id]/page.tsx` is supported well at the API layer — [`reportTemplateTenantCreateSchema`](../../../lib/validation.ts:330) `.omit({ tenant_id: true })` and the tenant-scoped POST override at [route.ts:54](../../../app/api/report-templates/route.ts:54) make the move drop-in. Things to clean up at migration time:

- Drop the "Assign a tenant first" branch in `CoverUploader` (U2).
- Remove the `tenant_id: string | null` from `BuilderTemplateMeta` (tenant becomes implicit).
- The dashboard page should call `/api/report-templates/[id]` (which needs a PATCH variant — currently only platform-admin has [id] routes).
- The dashboard mutation must NOT go through `/api/platform-admin/report-templates/[id]` — `withPlatformAuth` will 403 tenant users. A tenant-scoped PATCH route is missing today.
- `CreateReportTemplateModal`'s `enforceTenantId` prop already supports the dashboard variant — confirm it stays correct.

### Old superseded builder — out of scope, flag for cleanup

The previous builder (referenced by [DESIGN_SYSTEM.md:164](../../../DESIGN_SYSTEM.md:164) and still importable by stragglers) consists of `TemplateBuilder.tsx`, `SectionEditor.tsx`, `FieldCard.tsx`, `FieldEditor.tsx` in `components/platform-admin/`. Not audited in detail here. Suggest a follow-up branch to delete these once the new builder is committed.

---

## Recommended next steps

### Quick wins (each ≤30 min)

- Refuse the schema-version downgrade (Q1) — pick a fail-mode and write the branch.
- Move `CanvasMode` to a sibling `types.ts` (S3).
- Export `BuilderTemplateMeta` from `BuilderShell` and consume in `BuilderSidebar` / `page.tsx` (S2).
- Stabilise `ChoiceListEditor` keys (Q2).
- Mark `makeDefaultField`'s return type `FieldDef` (Q3).
- Drop `BuilderPreviewCanvas.tsx` reference from DESIGN_SYSTEM.md (D4).
- Make `handleSave` dedup-in-memory-only (Q4).

### Single-PR cleanups (≤2 hours)

- Tenant header trust fix (S1) — middleware overwrite, `getTenantId` UUID validation, `tenantListQuery` adoption. Hygiene; the deployment context blocks both today's and tomorrow's exploit paths, so no merge dependency.
- Replace `BuilderTopBar`'s hand-rolled segmented control with `<SegmentedControl>` (D1).
- Extract `lib/report-templates/ids.ts` and `lib/report-templates/defaults.ts` (BP1, S4).
- Adopt `Select` / `Textarea` primitives in `BuilderSidebar`, `CreateReportTemplateModal`, `TenantSelect` (D2 + D3).
- Stabilise `handleSave` dedup ordering (Q4).

### Larger refactors

- **Split `BuilderCanvas.tsx` into the canvas/ subdirectory** (M1) and introduce `BuilderContext` to retire the prop drilling (M2). Best done together; pays back A1 and unblocks future feature work.
- Extract `CoverUploader` (M3) and reuse it from the create modal so first-cover-upload can happen during template creation.
- Centralise status/dot/destructive colour tokens for the builder in `lib/design-system.ts` (D6).

### Out of scope (verify externally)

- `tenant-assets` Supabase storage bucket RLS policy — confirm a write policy exists that gates the `{tenantId}/report-templates/...` prefix to authorised users. If the prefix is world-writable, a tenant user could upload to another tenant's cover folder once the builder moves to `/dashboard/`.
- Old superseded builder cleanup (`TemplateBuilder.tsx`, `SectionEditor.tsx`, `FieldCard.tsx`, `FieldEditor.tsx`) — schedule for a follow-up branch after this changeset is committed.
- Tests — no Vitest coverage was added with this rework. The dedup logic, the schema-version handling, the slug retry loop, and the `FormField` mode-prop semantics are all good targets for `*.test.ts` companions.
