# Report Wizard — Multi-Step Form Refactor

## Overview

Refactor the report form page (`/dashboard/operations/reports/[id]`) from a single scrollable page rendering all sections into a full-screen multi-step wizard. Each template section becomes one wizard step, displayed one at a time in a centered card. The wizard uses a shell layout modeled on the existing BuilderShell pattern: top bar, scrollable center content, and a bottom step bar.

---

## Architecture Decisions

### 1. Shell Bypass Strategy

**Decision**: Add a pathname check to `DashboardShell` mirroring the pattern in `PlatformAdminShell`.

The `PlatformAdminShell` already does this on line 27:
```tsx
if (pathname.includes("/builder") || pathname.includes("/preview")) return <>{children}</>;
```

For `DashboardShell`, add a similar early return when the pathname matches a report form (the `/reports/` path with a UUID segment). The key nuance: `DashboardShell` uses `useTenant()` internally for the logo, so the bypass must happen **before** rendering the shell chrome but **after** `TenantProvider` wraps the tree — which it already does in `app/dashboard/layout.tsx` (lines 53-58). The bypass only skips the `DashboardShell` rendering; `TenantProvider` remains intact because it's in the parent layout.

**Approach**: Use a `/fill/` route segment convention. Rename the report form page route to include a segment that signals full-screen mode, OR check for a specific path pattern. The simplest approach matching the existing codebase convention: check `pathname.includes("/fill/")` — this gives us a clean, reusable pattern for any future full-screen dashboard pages.

The report wizard URL becomes: `/dashboard/operations/reports/[id]/fill`

This keeps the existing `/dashboard/operations/reports/[id]` page untouched (it can remain as the legacy view or redirect to `/fill`).

### 2. Component Architecture

**Decision**: Decompose into a shell component + focused subcomponents, following the BuilderShell pattern exactly.

```
ReportWizardShell          — orchestrator (state, save logic, step navigation)
├── WizardTopBar           — back link, title, step indicator, save status, submit
├── WizardStepContent      — center area, renders one FormSection with animation
└── WizardStepBar          — bottom bar with numbered step tabs + prev/next
```

This mirrors:
```
BuilderShell
├── BuilderTopBar
├── BuilderPreviewCanvas (center)
└── BuilderSectionBar (bottom)
```

### 3. Step Transition Animations

**Decision**: Horizontal slide using framer-motion `AnimatePresence` with directional awareness.

When navigating forward (next/clicking a later tab), content slides left-to-right out, new content slides in from right. Reverse for backward navigation. This provides spatial metaphor for progress.

The `BuilderPreviewCanvas` already demonstrates the pattern with `AnimatePresence mode="wait"` and `motion.div` — we extend it with an `x` axis instead of `y`, and track direction via a `useRef` that stores whether the last navigation was forward or backward.

### 4. Validation State Computation

**Decision**: Pure function `computeSectionValidation(section: SectionDef, data: Record<string, unknown>): "complete" | "incomplete" | "empty"`.

For each section:
- Get the section's fields where `field.required === true`
- Look up each required field's value in the section data
- "complete" = all required fields have non-empty values
- "incomplete" = some but not all required fields filled (or section has data but missing required)
- "empty" = no data at all

For repeater sections: check that at least `minItems` entries exist and each entry has all required fields filled.

This function is called per-section to determine the dot color on each step tab.

---

## Files to Create

### 1. `app/dashboard/operations/reports/[id]/fill/page.tsx`
New Next.js page — the wizard entry point.

**Responsibilities:**
- Client component with `"use client"`
- Accept `params: Promise<{ id: string }>` via `use()`
- Load report from Supabase (same query as current page.tsx lines 37-58)
- Load template via API (same as current page.tsx lines 49-52)
- Compute `initialData` with `buildAutoPopulatedData` (same as current page.tsx lines 70-74)
- Define `handleSave` callback (PATCH to `/api/reports`)
- Define `handleSubmit` callback (PATCH to `/api/reports` with `{ id, data, status: "submitted" }`)
- Render loading/error states (full-screen centered, since no shell chrome)
- Render `<ReportWizardShell>` with props: `schema`, `initialData`, `reportId`, `tenantId`, `reportTitle`, `templateName`, `reportStatus`, `onSave`, `onSubmit`

**Key difference from current page.tsx**: No wrapping div with `p-6 max-w-4xl`; that spacing is handled inside the wizard shell. The `handleSave` accepts a partial data object (just the current section) and merges it.

### 2. `components/reports/wizard/ReportWizardShell.tsx`
Main orchestrator component.

**Props:**
```tsx
interface ReportWizardShellProps {
  schema: TemplateSchema;
  initialData: Record<string, unknown>;
  reportId: string;
  tenantId: string;
  reportTitle: string;
  templateName: string;
  reportStatus: string;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}
```

**State:**
- `data: Record<string, unknown>` — full form data (all sections), initialized from `initialData`
- `currentStep: number` — index into `schema.sections`, starts at 0
- `direction: number` — +1 or -1, for animation direction
- `saveStatus: "idle" | "saving" | "saved" | "error"` — save indicator
- `submitting: boolean` — for submit button loading state

**Layout (JSX):**
```tsx
<div className="h-screen flex flex-col bg-background">
  <WizardTopBar ... />
  <WizardStepContent ... />  {/* flex-1 overflow-y-auto */}
  <WizardStepBar ... />
</div>
```

**Behavior:**
- `handleSectionChange(sectionId, sectionData)` — updates `data[sectionId]`
- `saveCurrentData()` — calls `onSave(data)` with full data object, manages saveStatus
- `goToStep(index)` — saves current data first (await), then sets direction and currentStep
- `handleNext()` — `goToStep(currentStep + 1)`
- `handlePrev()` — `goToStep(currentStep - 1)`
- `handleSubmit()` — saves, then calls `onSubmit(data)`
- Auto-save with debounce (reuse the same 1.5s debounce pattern from DynamicReportForm)
- `computeStepValidation()` — returns array of validation states for all sections

### 3. `components/reports/wizard/WizardTopBar.tsx`
Top bar component.

**Props:**
```tsx
interface WizardTopBarProps {
  reportTitle: string;
  currentStep: number;
  totalSteps: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  reportStatus: string;
  isLastStep: boolean;
  submitting: boolean;
  onSubmit: () => void;
}
```

**Layout:**
```
[← Reports]     [Report Title]  [Step 2 of 5]     [SaveStatus] [Submit btn]
```

- Height: `h-14 border-b border-border bg-background shrink-0` (matches BuilderTopBar)
- Left: Back link to `/dashboard/operations/reports` using ArrowLeftIcon (same pattern as BuilderTopBar)
- Center: Report title (`text-sm font-semibold truncate`) with step counter below (`text-xs text-muted-foreground`)
- Right: Save status dot + text (reuse BuilderTopBar pattern), and a Submit button that appears when:
  - `isLastStep === true` AND `reportStatus !== "submitted"`
  - Button text: "Submit Report" / "Submitting..."
  - Style: `rounded-full px-5 h-8 text-xs` (matches design system)

### 4. `components/reports/wizard/WizardStepContent.tsx`
Center content area with animated section transitions.

**Props:**
```tsx
interface WizardStepContentProps {
  section: SectionDef;
  sectionData: Record<string, unknown> | Record<string, unknown>[];
  onSectionChange: (data: Record<string, unknown> | Record<string, unknown>[]) => void;
  currentStep: number;
  direction: number;
  readOnly?: boolean;
  reportId: string;
  tenantId: string;
}
```

**Layout:**
- Outer: `flex-1 overflow-y-auto bg-muted/30`
- Inner: `max-w-3xl mx-auto p-6 lg:p-8`
- Uses `AnimatePresence mode="wait"` with `motion.div`
- Animation variants keyed on `currentStep`:
  ```tsx
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };
  ```
- Renders `<FormSection>` (the existing component, reused as-is) inside the motion wrapper
- Key on `section.id` to trigger AnimatePresence transitions

### 5. `components/reports/wizard/WizardStepBar.tsx`
Bottom navigation bar with numbered step tabs.

**Props:**
```tsx
interface WizardStepBarProps {
  sections: SectionDef[];
  currentStep: number;
  validationStates: Array<"complete" | "incomplete" | "empty">;
  onStepClick: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}
```

**Layout:**
- Outer: `h-16 border-t border-border bg-background shrink-0 flex items-center px-3 gap-1.5`
- Left: Prev button (ChevronLeftIcon, disabled when `currentStep === 0`)
- Center: Scrollable row of step tabs (matches BuilderSectionBar styling exactly)
  - Each tab: numbered badge + truncated title
  - Active: `bg-foreground text-background shadow-sm`
  - Inactive: `bg-secondary/60 text-muted-foreground hover:bg-secondary`
  - Validation dot: small circle on the badge
    - Green (`bg-emerald-400`): "complete"
    - Amber (`bg-amber-400`): "incomplete"
    - No dot: "empty"
- Right: Next button (ChevronRightIcon, disabled when on last step)
- Prev/Next buttons: `rounded-full` outline buttons matching design system
- `overflow-x-auto` on the center section for horizontal scrolling on mobile

### 6. `lib/reports/validation.ts`
Pure validation utility.

**Exports:**
```tsx
export type SectionValidationState = "complete" | "incomplete" | "empty";

export function computeSectionValidation(
  section: SectionDef,
  data: Record<string, unknown> | Record<string, unknown>[] | undefined
): SectionValidationState;

export function computeAllSectionValidations(
  schema: TemplateSchema,
  data: Record<string, unknown>
): SectionValidationState[];
```

**Logic for standard sections:**
```
requiredFields = section.fields.filter(f => f.required && f.type !== "heading")
if (requiredFields.length === 0) return "complete"  // no required fields = always valid
filledCount = requiredFields.filter(f => !isEmpty(sectionData[f.id])).length
if (filledCount === requiredFields.length) return "complete"
if (filledCount > 0 || hasAnyData) return "incomplete"
return "empty"
```

**Logic for repeater sections:**
```
if (!Array.isArray(data) || data.length === 0) {
  return section.minItems && section.minItems > 0 ? "empty" : "complete"
}
// Check each item has all required fields
allItemsComplete = data.every(item => requiredFields.every(f => !isEmpty(item[f.id])))
if (allItemsComplete && data.length >= (section.minItems || 0)) return "complete"
return "incomplete"
```

Uses the same `isEmpty` logic as auto-populate: `value === undefined || value === null || value === ""`.

---

## Files to Modify

### 1. `app/dashboard/DashboardShell.tsx`
**Change**: Add shell bypass for the `/fill` pattern.

Add early return at the top of the component, after the hooks but before the JSX:
```tsx
// Full-screen pages bypass shell chrome
if (pathname.includes("/fill")) return <>{children}</>;
```

This must go after `usePathname()` (line 33) and after `useTenant()` (line 45) since those are hooks and can't be called conditionally. Place it right before the `return` at line 82.

**Impact**: Minimal — only adds 2 lines. No existing routes contain `/fill` in their path, so no unintended matches. The pattern is intentionally narrow.

### 2. `app/dashboard/operations/reports/[id]/page.tsx` (optional minor change)
**Change**: Add a link/button to open the wizard view.

After the status badge (line 133), add a button:
```tsx
<Link href={`/dashboard/operations/reports/${id}/fill`} className="...">
  Open Wizard
</Link>
```

Or: redirect from this page to `/fill` automatically if a template is attached. This is a UX decision — the simplest approach is to just change the existing page to redirect to the fill route when a template exists.

---

## Implementation Sequence

### Phase 1: Foundation (no UI changes yet)
1. Create `lib/reports/validation.ts` — pure function, independently testable
2. Modify `app/dashboard/DashboardShell.tsx` — add the `/fill` bypass (2 lines)

### Phase 2: Shell + Layout
3. Create `components/reports/wizard/WizardTopBar.tsx`
4. Create `components/reports/wizard/WizardStepBar.tsx`
5. Create `components/reports/wizard/WizardStepContent.tsx`

### Phase 3: Orchestrator + Page
6. Create `components/reports/wizard/ReportWizardShell.tsx`
7. Create `app/dashboard/operations/reports/[id]/fill/page.tsx`

### Phase 4: Polish
8. Add link from existing report page to wizard (or add redirect)
9. Mobile testing and responsive adjustments
10. Edge case handling (0 sections, 1 section, submitted/read-only state)

---

## Key Implementation Details

### Auto-save on Step Navigation
When the user clicks a step tab or prev/next, the wizard should save the current data before transitioning. Pattern:
```tsx
const goToStep = async (targetIndex: number) => {
  // Save current data first
  await saveCurrentData();
  // Then transition
  setDirection(targetIndex > currentStep ? 1 : -1);
  setCurrentStep(targetIndex);
};
```

The debounced auto-save also runs in the background (same as `DynamicReportForm`), so there's a belt-and-suspenders approach: debounced auto-save on any change + explicit save on navigation.

### Submit Flow
On the final step, the Submit button:
1. Saves current data
2. Calls PATCH `/api/reports` with `{ id, data, status: "submitted" }`
3. Shows toast via sonner: `toast.success("Report submitted")`
4. Navigates back to reports list via `router.push("/dashboard/operations/reports")`

The API already supports updating `status` alongside `data` in one PATCH call (confirmed in `reportUpdateSchema` which merges `reportSchema.partial()` — both `data` and `status` are optional fields).

### Read-Only Mode
When `reportStatus === "submitted"`, the wizard should render in read-only mode:
- Pass `readOnly` to `FormSection`
- Hide the Submit button
- Show a "Submitted" badge in the top bar
- Step navigation still works (for reviewing)

### Mobile Responsiveness
- Top bar: On small screens, hide the step counter text and show only the title. Use `hidden sm:block` on the step counter.
- Step bar: The `overflow-x-auto` on the tab container allows horizontal scrolling. Each tab has `shrink-0`.
- Prev/Next buttons: Always visible, use icon-only on mobile (`hidden sm:inline` on button text).
- Content area: The `max-w-3xl mx-auto p-6` already works well on mobile with the padding collapsing.

### Data Shape Compatibility
The wizard uses the exact same data shape as the current form: `{ [sectionId]: { [fieldId]: value } }`. The `FormSection` component is reused without any changes. The save API call sends the full data object, same as today.

---

## Edge Cases

1. **Template with 0 sections**: Show an empty state (same as current behavior) — "This template has no sections."
2. **Template with 1 section**: Wizard still works, just no prev/next and only one tab. The step bar simplifies to a single active tab.
3. **Browser back button**: Uses Next.js router, so back navigates away from the wizard (back to reports list). The auto-save ensures data is persisted.
4. **Unsaved changes warning**: Consider adding `beforeunload` event listener when there are unsaved changes, similar to how form editors typically warn users.
5. **Network errors on save**: Show error toast, keep `saveStatus` as `"error"`, allow retry.
6. **Rapid step switching**: The `await saveCurrentData()` in `goToStep` prevents data loss, but rapid clicking could queue up saves. Use a `saving` flag to debounce rapid transitions, or disable step buttons while saving.

---

## Files Summary

**New files (6):**
- `app/dashboard/operations/reports/[id]/fill/page.tsx`
- `components/reports/wizard/ReportWizardShell.tsx`
- `components/reports/wizard/WizardTopBar.tsx`
- `components/reports/wizard/WizardStepContent.tsx`
- `components/reports/wizard/WizardStepBar.tsx`
- `lib/reports/validation.ts`

**Modified files (1-2):**
- `app/dashboard/DashboardShell.tsx` (add 2-line bypass)
- `app/dashboard/operations/reports/[id]/page.tsx` (optional: add link or redirect to `/fill`)

**Reused as-is (5):**
- `components/reports/FormSection.tsx`
- `components/reports/FormField.tsx`
- `components/reports/EntitySelectField.tsx`
- `components/reports/PhotoUploadField.tsx`
- `components/reports/RepeaterSection.tsx`
