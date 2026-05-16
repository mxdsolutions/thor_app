# Tasks — Platform-admin builder rework audit

**Source:** [AUDIT.md](./AUDIT.md)
**Date:** 2026-05-16
**Status:** not-started

ID prefixes: **S** security · **Q** code quality · **M** modularity · **U** UX · **D** design system · **A** agent friendliness · **BP** best practices

---

## Priority 1 — Critical (do before merging)

- [ ] **Q1** — Refuse the schema-version downgrade at [app/platform-admin/builder/[id]/page.tsx:64-67](../../../app/platform-admin/builder/[id]/page.tsx:64). Replace the silent fallback to an empty v1 schema with one of: (a) hard-fail the render with a "saved by a newer version" message, (b) read-only JSON view, or (c) explicit migration helper. The bar is *don't silently substitute empty data*.
- [ ] **D1** — Replace the hand-rolled segmented control at [components/platform-admin/builder/BuilderTopBar.tsx:50-64, 109-124](../../../components/platform-admin/builder/BuilderTopBar.tsx:50) with `<SegmentedControl>` from [components/ui/segmented-control.tsx](../../../components/ui/segmented-control.tsx). DESIGN_SYSTEM.md explicitly mandates it.

## Priority 2 — Major

### Defense-in-depth

- [ ] **S1** — Close the tenant-ID header trust gap. (1) In [middleware.ts:225-234](../../../middleware.ts:225), always overwrite `x-tenant-id` (set to empty or `request.headers.delete('x-tenant-id')`) outside the `if (tenantId)` block. (2) In [lib/tenant.ts:38-50](../../../lib/tenant.ts:38), UUID-validate the header value against the `pgUuid` regex from [lib/validation.ts:296-299](../../../lib/validation.ts:296) before returning. (3) In [app/api/report-templates/route.ts:18](../../../app/api/report-templates/route.ts:18), replace the interpolated `or(\`tenant_id.eq.${tenantId},tenant_id.is.null\`)` with `tenantListQuery` from [app/api/_lib/list-query.ts](../../../app/api/_lib/list-query.ts) per CLAUDE.md. (Practical risk is near-zero in both today's `/platform-admin/`-only world and the planned `/dashboard/` world — see AUDIT.md §5 S1 for the deployment-context analysis. Land as hygiene.)

### Modularity & structure

- [ ] **M1** — Split [components/platform-admin/builder/BuilderCanvas.tsx](../../../components/platform-admin/builder/BuilderCanvas.tsx) (727 LOC) under `components/platform-admin/builder/canvas/`: `BuilderCanvas.tsx` (wrapper), `PageContent.tsx`, `FieldCell.tsx`, `FieldToolbar.tsx`, `SectionSettings.tsx`, `AddQuestionRow.tsx`, `ChoiceListEditor.tsx`. Each subcomponent already has its own typed props interface — extraction is mostly a mechanical move.
- [ ] **M2** — Replace the seven-callback prop drilling (`BuilderShell → BuilderCanvas → PageContent → FieldCell`) with a `BuilderContext` scoped to the active page. Each `FieldCell` consumes `useBuilderActions(sectionIndex)`. Best landed alongside M1.
- [ ] **M3** — Extract `CoverUploader` from [components/platform-admin/builder/BuilderSidebar.tsx:243-362](../../../components/platform-admin/builder/BuilderSidebar.tsx:243) into its own file `components/platform-admin/builder/CoverUploader.tsx`. Then reuse from `CreateReportTemplateModal` so first-cover-upload happens during template creation.
- [ ] **S2** — Export `BuilderTemplateMeta` from [BuilderShell.tsx:13-19](../../../components/platform-admin/builder/BuilderShell.tsx:13) and consume `import type { BuilderTemplateMeta }` (or `Partial<BuilderTemplateMeta>`) in [BuilderSidebar.tsx:23-41](../../../components/platform-admin/builder/BuilderSidebar.tsx:23) and [page.tsx:22-29](../../../app/platform-admin/builder/[id]/page.tsx:22). Removes two inline duplicates.
- [ ] **S3** — Move `CanvasMode` from [BuilderCanvas.tsx:27](../../../components/platform-admin/builder/BuilderCanvas.tsx:27) to a sibling `types.ts` (or extend `question-types.ts` and rename). `BuilderShell` and `BuilderTopBar` import from there — fixes the inverted layering.
- [ ] **S4** — Extract `EMPTY_TEMPLATE_SCHEMA` and `buildStarterSection()` into `lib/report-templates/defaults.ts`. Consume from [api/platform-admin/report-templates/route.ts:37-47](../../../app/api/platform-admin/report-templates/route.ts:37), [api/report-templates/route.ts:39-49](../../../app/api/report-templates/route.ts:39), and [BuilderShell.tsx:70-72](../../../components/platform-admin/builder/BuilderShell.tsx:70).

### Code quality

- [ ] **Q2** — Stabilise React keys in `ChoiceListEditor` at [BuilderCanvas.tsx:684-715](../../../components/platform-admin/builder/BuilderCanvas.tsx:684). Generate a per-choice id on creation (`crypto.randomUUID()` is fine for a client-only id). Don't use the `value` field — users edit it to empty mid-typing.
- [ ] **Q3** — Type `makeDefaultField`'s return as `FieldDef` at [question-types.ts:53](../../../components/platform-admin/builder/question-types.ts:53). Lets consumers drop the cast at [BuilderCanvas.tsx:78](../../../components/platform-admin/builder/BuilderCanvas.tsx:78). Optionally use a non-literal placeholder id like `__pending__` to make the "always replaced" contract explicit.
- [ ] **Q4** — In [BuilderShell.tsx:282-299](../../../components/platform-admin/builder/BuilderShell.tsx:282), dedup IDs *in memory only* for the save payload. Don't `setSchema(dedupedSchema)` until `await onSave(...)` resolves successfully — otherwise the user's data is mutated by a failed save.

### Best practices

- [ ] **BP1** — Extract `lib/report-templates/ids.ts` with `slugifyHyphen` (template slugs, matches the validation regex), `slugifyUnderscore` and `dedupeId(id, existing)` (field/section IDs). Consume from [BuilderShell.tsx:28-43](../../../components/platform-admin/builder/BuilderShell.tsx:28), [BuilderCanvas.tsx:62-68, 666-668](../../../components/platform-admin/builder/BuilderCanvas.tsx:62), [CreateReportTemplateModal.tsx:48-55](../../../components/modals/CreateReportTemplateModal.tsx:48).

### Design system

- [ ] **D2** — Replace native `<select>` / `<textarea>` with the design-system primitives in the eleven sites listed in AUDIT.md §7. Highest-leverage targets: [FormField.tsx:97-105, 167-179](../../../components/reports/FormField.tsx:97) (shared with wizard + PDF), [TenantSelect.tsx:41-57](../../../components/platform-admin/TenantSelect.tsx:41), `BuilderSidebar`/`BuilderCanvas`/`CreateReportTemplateModal` category dropdowns. Intentionally borderless inline inputs (section title at canvas:172) can stay native — extract a shared `InlineEditableInput` primitive from [FormField.tsx:376-398](../../../components/reports/FormField.tsx:376).
- [ ] **D3** — Once D2 lands, the duplicated `"flex h-9 w-full rounded-xl border border-border/60 bg-background px-3 ..."` strings across [BuilderSidebar.tsx](../../../components/platform-admin/builder/BuilderSidebar.tsx), [TenantSelect.tsx](../../../components/platform-admin/TenantSelect.tsx), [CreateReportTemplateModal.tsx](../../../components/modals/CreateReportTemplateModal.tsx), and [FormField.tsx](../../../components/reports/FormField.tsx) are gone. Verify and remove any residuals.
- [ ] **D4** — Update [DESIGN_SYSTEM.md:164](../../../DESIGN_SYSTEM.md:164) — the `rounded-[2rem]` exception cites `BuilderPreviewCanvas.tsx` which was deleted in this changeset. Either remove the exception or rephrase to "the device-frame mockup, wherever it lives".

### UX

- [ ] **U1** — Fix the mode-toggle / left-button overlap at narrow widths. Landed naturally with D1 once `<SegmentedControl>` sits in a flex slot rather than `position: absolute`.

### Agent friendliness

- [ ] **A1** — Cross-cuts M1; resolved by the canvas/ split.

## Priority 3 — Minor

- [ ] **U2** — When the builder moves to `/dashboard/builder/...`, delete the "Assign a tenant first" branch in [BuilderSidebar.tsx:279-285](../../../components/platform-admin/builder/BuilderSidebar.tsx:279) and the `tenant_id` field from `BuilderTemplateMeta`. Tracked here so it's not forgotten at migration time.
- [ ] **U3** — Replace the disabled-Submit native `title` tooltip at [PreviewWizardNav.tsx:46-49](../../../components/platform-admin/builder/PreviewWizardNav.tsx:46) with a visible "Preview only" helper line.
- [ ] **U4** — Make `AddQuestionRow` at [BuilderCanvas.tsx:583-660](../../../components/platform-admin/builder/BuilderCanvas.tsx:583) close on outside-click (wrap in `Popover` or add an outside-click effect).
- [ ] **U5** — Set `justAddedFieldId` in `handleDuplicateField` too (currently only `handleAddQuestion` does), so the duplicated field's label auto-focuses for renaming.
- [ ] **U6** — Add keyboard shortcuts: `⌘S` save, `⌘E`/`⌘P` mode toggle, `⌘↵` add section.
- [ ] **Q5** — In [BuilderShell.tsx:91-97, 167-179](../../../components/platform-admin/builder/BuilderShell.tsx:91), skip `markChanged()` when the new sections array equals the old one (no-op reorder shouldn't dirty the page).
- [ ] **Q6** — In `handleDeleteSection` at [BuilderShell.tsx:147-156](../../../components/platform-admin/builder/BuilderShell.tsx:147), compute `newLen` inside the functional `setPage` updater instead of closing over `schema.sections.length`.
- [ ] **Q7** — Replace `Date.now()` fallback at [BuilderShell.tsx:34](../../../components/platform-admin/builder/BuilderShell.tsx:34) with a counter or `crypto.randomUUID()`.
- [ ] **Q8** — Replace the duck-typed `{ code: "SLUG_EXHAUSTED", message }` at [slug.ts:30-37](../../../lib/report-templates/slug.ts:30) with a `class SlugExhaustedError extends Error` so it surfaces distinctly in logs.
- [ ] **Q9** — Replace `as Parameters<typeof ReportPDF>[0]["report"]` casts at [preview-pdf.ts:67, 85](../../../lib/report-templates/preview-pdf.ts:67) with an exported `ReportPDFProps` type and a typed adapter.
- [ ] **BP2** — Centralise `LATEST_SCHEMA_VERSION` in `lib/report-templates/defaults.ts` so the `version: 1` literal scattered across [BuilderShell.tsx:71](../../../components/platform-admin/builder/BuilderShell.tsx:71), both API routes, and [lib/validation.ts:288](../../../lib/validation.ts:288) updates in one place when v2 ships.
- [ ] **BP3** — Verify `pgUuid` regex at [lib/validation.ts:296-299](../../../lib/validation.ts:296) is never reused on a user-supplied input path (currently only server-derived IDs).
- [ ] **BP4** — Move `document.title` patching at [page.tsx:15-19](../../../app/platform-admin/builder/[id]/page.tsx:15) to Next.js metadata.
- [ ] **A2** — Add `/* --- */` section-banner comments to [BuilderShell.tsx](../../../components/platform-admin/builder/BuilderShell.tsx) — natural divisions are "section ops", "field ops", "meta", "preview", "save".
- [ ] **A3** — Add JSDoc to `BuilderShell`'s exported function and `onSave` parameter (throws on failure, no double-toast contract).
- [ ] **A4** — Lift magic strings (`"section_1"`, `"new_question"`, `"Sample tenant"`) into named constants.
- [ ] **S5** — Split `question-types.ts` into `meta.ts` (icons/labels) + `factories.ts` (`makeDefaultField`) so wizard / `FormField` can import metadata without the factory.
- [ ] **D5** — Adopt `metaClass` / `statLabelClass` / `sectionLabelSoftClass` tokens from `lib/design-system.ts` where the intent matches in [BuilderSidebar.tsx](../../../components/platform-admin/builder/BuilderSidebar.tsx) and [BuilderCanvas.tsx](../../../components/platform-admin/builder/BuilderCanvas.tsx).
- [ ] **D6** — Add `saveStatusDotClass` and `destructiveTextClass` exports to `lib/design-system.ts`; consume from [BuilderTopBar.tsx:84-85](../../../components/platform-admin/builder/BuilderTopBar.tsx:84) and the destructive buttons across the builder.

## Cross-cutting / verify externally

- [ ] **X1** — Distinguish the `pdf-lib` dynamic-import failure from the cover-fetch failure at [preview-pdf.ts:88-111](../../../lib/report-templates/preview-pdf.ts:88) — wrap just the import in its own try/catch with a different toast.
- [ ] **X2** — Rename `CanvasMode` to `{ "edit" | "form-preview" }` (or document the overlap with `FormFieldMode` `"preview"` at the call site in [BuilderCanvas.tsx:360](../../../components/platform-admin/builder/BuilderCanvas.tsx:360)).
- [ ] **X3** — Decide on `FormField` read-only strategy: pick one of `disabled` / `readOnly` / explicit `!inputsReadOnly` `onChange` guard and apply uniformly across all field types in [FormField.tsx](../../../components/reports/FormField.tsx).
- [ ] **X4** — *Verify externally:* `tenant-assets` Supabase storage bucket has an RLS write policy that gates the `{tenantId}/report-templates/...` prefix. `grep` of `supabase/migrations/` returned no policy file. Critical before the builder moves to `/dashboard/builder` (tenant users could otherwise upload to siblings' cover folders).
- [ ] **X5** — *Out of scope, schedule:* Delete the superseded old builder once this changeset is committed: `components/platform-admin/{TemplateBuilder,SectionEditor,FieldCard,FieldEditor}.tsx`. Confirm no remaining importers first.
- [ ] **X6** — *`/dashboard/builder` migration prep:* add a tenant-scoped PATCH route at `/api/report-templates/[id]` (currently only `/api/platform-admin/report-templates/[id]` has PATCH/DELETE — `withPlatformAuth` will 403 tenant users).

## Suggested order of execution

1. **Q1, D1** — Critical, do before merging. Q1 prevents forward-compat data loss; D1 is a quick design-system fix.
2. **S1** — Defense-in-depth hygiene. Land alongside the cleanup batch; not a merge dependency because the exploit precondition is blocked by deployment shape both today and after the `/dashboard/builder` migration.
3. **Q4, Q2, Q3, S2, S3, S4** — Small targeted cleanups, all <30 min each. Run as a batch.
4. **BP1, D4, BP4, U2 reminder, Q5–Q9, BP2, A2–A4** — Quality polish batch. Can be one PR or several small ones.
5. **D2, D3** — Design-system primitive adoption. Touch FormField (shared with wizard + PDF) carefully — visual regression-test the wizard at `/r/[token]` and a PDF render afterwards.
6. **M1 + M2** — Big refactor: canvas/ split + `BuilderContext`. Pays back A1 and unblocks future feature work. Lands as its own PR.
7. **M3** — Extract `CoverUploader`; reuse in create modal.
8. **X1–X3, U1, U3–U6** — Polish items.
9. **X4 (storage RLS), X5 (delete old builder), X6 (tenant PATCH route)** — Schedule alongside the `/dashboard/builder` migration work.
