/**
 * Builder-level types shared between the shell, top bar, and canvas.
 *
 * Keep this file dependency-free — it's imported by both the orchestrator
 * (BuilderShell) and the leaves (BuilderCanvas, BuilderTopBar), so anything
 * that pulls heavy modules in here would create import cycles.
 */

/**
 * Which surface the builder is currently rendering.
 *  - "edit"    → editable canvas with toolbars + sidebar
 *  - "preview" → wizard-shaped preview that mirrors what the tradie sees at /r
 *
 * Distinct from `FormFieldMode` (`"fill" | "preview" | "edit"`) in
 * `components/reports/FormField.tsx`: `"preview"` means "read-only display"
 * over there. `FieldCell` translates between the two at render time.
 */
export type CanvasMode = "edit" | "preview";
