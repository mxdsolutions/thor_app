"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { TemplateSchema, SectionDef, FieldDef } from "@/lib/report-templates/types";
import type { PresetFieldGroup } from "@/lib/report-templates/presets";
import { BuilderTopBar } from "./BuilderTopBar";
import { BuilderCanvas, CanvasProvider, type BuilderActions } from "./canvas";
import { BuilderSidebar } from "./BuilderSidebar";
import { PreviewWizardNav } from "./PreviewWizardNav";
import type { CanvasMode } from "./types";
import { renderTemplatePreviewPdf } from "@/lib/report-templates/preview-pdf";
import { buildStarterSection } from "@/lib/report-templates/defaults";
import { dedupeId, generateSectionId } from "@/lib/report-templates/ids";

export interface BuilderTemplateMeta {
    name: string;
    category: string;
    description: string;
    tenant_id: string | null;
    report_cover_url: string | null;
}

interface BuilderShellProps {
    templateId: string;
    initialSchema: TemplateSchema;
    initialMeta: BuilderTemplateMeta;
    /**
     * Persist the template. Must throw on failure — the shell catches and
     * surfaces a toast. Must not double-toast on success; the page is
     * expected to fire its own "Template saved" toast inside this callback.
     */
    onSave: (schema: TemplateSchema, meta: BuilderTemplateMeta) => Promise<void>;
}

/**
 * Sweep the schema for duplicate section / field ids and suffix collisions
 * with `_2`, `_3`, …. Called right before save so the persisted schema can
 * never contain colliding ids regardless of how the user composed it.
 */
function dedupeSchemaIds(schema: TemplateSchema): { schema: TemplateSchema; renamed: number } {
    let renamed = 0;
    const sectionIds = new Set<string>();
    const newSections = schema.sections.map((section) => {
        const sectionId = dedupeId(section.id, sectionIds);
        if (sectionId !== section.id) renamed++;
        sectionIds.add(sectionId);

        const fieldIds = new Set<string>();
        const newFields = section.fields.map((field) => {
            const fieldId = dedupeId(field.id, fieldIds);
            if (fieldId !== field.id) renamed++;
            fieldIds.add(fieldId);
            return fieldId === field.id ? field : { ...field, id: fieldId };
        });

        if (sectionId === section.id && newFields.every((f, i) => f === section.fields[i])) {
            return section;
        }
        return { ...section, id: sectionId, fields: newFields };
    });

    return { schema: { ...schema, sections: newSections }, renamed };
}

/**
 * Top-level state orchestrator for the template builder. Owns the schema,
 * the meta, dirty-state tracking, page navigation, and the canvas mode.
 * Children are mostly presentational — they receive the slice they care
 * about plus index-prepended action callbacks.
 *
 * Save behaviour: the shell sweeps the schema for duplicate ids on every
 * save (preventing colliding ids from ever reaching the DB), commits any
 * renames only after `onSave` resolves cleanly, and surfaces both the
 * "couldn't save" toast (on failure) and the "N ids renamed" toast (on a
 * dedup-changing success).
 */
export function BuilderShell({ templateId, initialSchema, initialMeta, onSave }: BuilderShellProps) {
    const seededInitialSchema =
        initialSchema.sections.length === 0
            ? { ...initialSchema, sections: [buildStarterSection()] }
            : initialSchema;

    const [schema, setSchema] = useState<TemplateSchema>(seededInitialSchema);
    const [meta, setMeta] = useState(initialMeta);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    // Single-page wizard-style: track which page is showing + animation direction
    const [page, setPage] = useState<{ index: number; direction: number }>({ index: 0, direction: 1 });
    const [canvasMode, setCanvasMode] = useState<CanvasMode>("edit");
    const [previewingPdf, setPreviewingPdf] = useState(false);

    const markChanged = useCallback(() => setHasChanges(true), []);

    const updateSections = useCallback(
        (updater: (sections: SectionDef[]) => SectionDef[]) => {
            setSchema((prev) => ({ ...prev, sections: updater(prev.sections) }));
            markChanged();
        },
        [markChanged]
    );

    const goToPage = (idx: number) => {
        setPage((prev) => ({ index: idx, direction: idx > prev.index ? 1 : -1 }));
    };

    /* ------------------------------------------------------------------ */
    /*  Section ops                                                        */
    /* ------------------------------------------------------------------ */

    const handleAddBlankSection = () => {
        const sectionIds = new Set(schema.sections.map((s) => s.id));
        const baseTitle = `Section ${schema.sections.length + 1}`;
        const sectionId = generateSectionId(baseTitle, sectionIds);
        const newSection: SectionDef = {
            id: sectionId,
            title: baseTitle,
            type: "standard",
            fields: [],
        };
        const newIndex = schema.sections.length;
        updateSections((s) => [...s, newSection]);
        setPage({ index: newIndex, direction: 1 });
    };

    const handleAddPresetAsSection = (preset: PresetFieldGroup) => {
        const sectionIds = new Set(schema.sections.map((s) => s.id));
        const sectionId = generateSectionId(preset.name, sectionIds);

        const fieldIds = new Set<string>();
        const fields = preset.fields.map((f) => {
            const id = dedupeId(f.id, fieldIds);
            fieldIds.add(id);
            return id === f.id ? f : { ...f, id };
        });

        const newSection: SectionDef = {
            id: sectionId,
            title: preset.name,
            type: "standard",
            fields,
        };
        const newIndex = schema.sections.length;
        updateSections((s) => [...s, newSection]);
        setPage({ index: newIndex, direction: 1 });
        toast.success(`Added "${preset.name}" as a new section`);
    };

    const handleAddSection = (preset: PresetFieldGroup | null) => {
        if (preset) handleAddPresetAsSection(preset);
        else handleAddBlankSection();
    };

    const handleDeleteSection = (sectionIndex: number) => {
        // Compute post-delete length up front so the page-clamp updater
        // doesn't depend on closed-over state racing with the schema update.
        // schema.sections.length is the pre-delete count at this handler's
        // call time (set by the click that fired us), so length - 1 is the
        // post-delete count.
        const newLen = schema.sections.length - 1;
        updateSections((s) => s.filter((_, i) => i !== sectionIndex));
        setPage((prev) => {
            if (newLen <= 0) return { index: 0, direction: -1 };
            return { index: Math.min(prev.index, newLen - 1), direction: -1 };
        });
    };

    const handleUpdateSection = (sectionIndex: number, updates: Partial<SectionDef>) => {
        updateSections((s) => s.map((sec, i) => (i === sectionIndex ? { ...sec, ...updates } : sec)));
    };

    /**
     * Reorder sections. Fired by the sidebar's drag-and-drop list.
     * Tracks the currently-active section by id so it stays selected even
     * if its index changes as a result of the reorder. Skips the dirty-mark
     * if every section landed at the same index it started at (a drag that
     * dropped into the same slot shouldn't enable the Save button).
     */
    const handleReorderSections = (newSections: SectionDef[]) => {
        const prevSections = schema.sections;
        const isNoOp =
            newSections.length === prevSections.length &&
            newSections.every((s, i) => s.id === prevSections[i]?.id);
        if (isNoOp) return;

        const activeId = prevSections[page.index]?.id;
        setSchema((prev) => ({ ...prev, sections: newSections }));
        markChanged();
        if (activeId) {
            const newIndex = newSections.findIndex((s) => s.id === activeId);
            if (newIndex >= 0) {
                // direction: 0 → AnimatePresence keeps the same key
                // (section.id unchanged), so no slide animation triggers.
                setPage({ index: newIndex, direction: 0 });
            }
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Field ops (explicit sectionIndex)                                  */
    /* ------------------------------------------------------------------ */
    const handleAddField = (sectionIndex: number, field: FieldDef) => {
        updateSections((s) =>
            s.map((sec, i) => {
                if (i !== sectionIndex) return sec;
                const existingIds = new Set(sec.fields.map((f) => f.id));
                const dedupedId = dedupeId(field.id, existingIds);
                const finalField = dedupedId === field.id ? field : { ...field, id: dedupedId };
                return { ...sec, fields: [...sec.fields, finalField] };
            })
        );
    };

    const handleUpdateField = (sectionIndex: number, fieldIndex: number, field: FieldDef) => {
        updateSections((s) =>
            s.map((sec, i) =>
                i === sectionIndex
                    ? { ...sec, fields: sec.fields.map((f, fi) => (fi === fieldIndex ? field : f)) }
                    : sec
            )
        );
    };

    const handleDeleteField = (sectionIndex: number, fieldIndex: number) => {
        updateSections((s) =>
            s.map((sec, i) =>
                i === sectionIndex
                    ? { ...sec, fields: sec.fields.filter((_, fi) => fi !== fieldIndex) }
                    : sec
            )
        );
    };

    const handleMoveField = (
        sectionIndex: number,
        fieldIndex: number,
        direction: "up" | "down"
    ) => {
        const target = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
        updateSections((s) =>
            s.map((sec, i) => {
                if (i !== sectionIndex) return sec;
                if (target < 0 || target >= sec.fields.length) return sec;
                const fields = [...sec.fields];
                [fields[fieldIndex], fields[target]] = [fields[target], fields[fieldIndex]];
                return { ...sec, fields };
            })
        );
    };

    const handleDuplicateField = (sectionIndex: number, fieldIndex: number) => {
        updateSections((s) =>
            s.map((sec, i) => {
                if (i !== sectionIndex) return sec;
                const source = sec.fields[fieldIndex];
                if (!source) return sec;
                const existingIds = new Set(sec.fields.map((f) => f.id));
                const dupedId = dedupeId(`${source.id}_copy`, existingIds);
                const copy: FieldDef = { ...source, id: dupedId };
                const fields = [
                    ...sec.fields.slice(0, fieldIndex + 1),
                    copy,
                    ...sec.fields.slice(fieldIndex + 1),
                ];
                return { ...sec, fields };
            })
        );
    };

    /* ------------------------------------------------------------------ */
    /*  Meta                                                               */
    /* ------------------------------------------------------------------ */

    const handleUpdateMeta = (updates: Partial<BuilderTemplateMeta>) => {
        setMeta((prev) => ({ ...prev, ...updates }));
        markChanged();
    };

    /* ------------------------------------------------------------------ */
    /*  Preview as PDF                                                     */
    /* ------------------------------------------------------------------ */

    const handlePreviewPdf = async () => {
        setPreviewingPdf(true);
        try {
            // Fetch tenant branding so the preview shows the real cover / logo
            // / company info. If no tenant is assigned, fall back to a minimal
            // sample tenant inside `renderTemplatePreviewPdf`.
            let tenant: Awaited<ReturnType<typeof fetchTenantBranding>> = null;
            if (meta.tenant_id) {
                tenant = await fetchTenantBranding(meta.tenant_id);
            }
            await renderTemplatePreviewPdf({
                templateName: meta.name,
                schema,
                templateCoverUrl: meta.report_cover_url,
                tenant,
            });
        } catch (err) {
            console.error("Preview PDF failed", err);
            toast.error("Couldn't generate PDF preview");
        } finally {
            setPreviewingPdf(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Save                                                               */
    /* ------------------------------------------------------------------ */

    const handleSave = async () => {
        setSaving(true);
        try {
            // Dedup in-memory only for the save payload. We must not mutate
            // `schema` state until persistence succeeds — otherwise a failed
            // save leaves the user with IDs they didn't consent to (and the
            // toast is the only signal). Commit the rename + warn only after
            // `onSave` resolves cleanly.
            const { schema: dedupedSchema, renamed } = dedupeSchemaIds(schema);
            await onSave(dedupedSchema, meta);
            if (renamed > 0) {
                setSchema(dedupedSchema);
                toast.warning(
                    `${renamed} duplicate ID${renamed === 1 ? "" : "s"} renamed to prevent conflicts`
                );
            }
            setHasChanges(false);
        } catch {
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    // ⌘S / Ctrl+S → save when dirty. Bound at the document level so the
    // shortcut fires even when focus is inside a deep editable input. Skips
    // when already saving or when there's nothing to save (lets the browser
    // fall through to its own default — usually a no-op on a web app).
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                if (!hasChanges || saving) return;
                e.preventDefault();
                void handleSave();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
        // No deps array on purpose — handleSave closes over the latest
        // schema/meta via state. Re-binding each render guarantees the
        // shortcut always persists the current state, not a stale snapshot.
    });

    const safePageIndex = Math.min(page.index, Math.max(0, schema.sections.length - 1));

    // Bundle the seven field/section mutators into the shape that
    // <CanvasProvider> expects. The actions object identity changes per
    // render — children that derive scoped actions via useFieldActions /
    // useSectionActions re-memoise on identity change. That's fine: the
    // canvas tree re-renders whenever schema changes anyway.
    const canvasActions: BuilderActions = useMemo(
        () => ({
            updateSection: handleUpdateSection,
            deleteSection: handleDeleteSection,
            addField: handleAddField,
            updateField: handleUpdateField,
            deleteField: handleDeleteField,
            moveField: handleMoveField,
            duplicateField: handleDuplicateField,
        }),
        // The handlers close over `schema`; recompute whenever it changes so
        // canvas children read the latest. They're stable per render for
        // canvas-internal memoised consumers.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [schema],
    );

    return (
        <div className="h-screen flex flex-col bg-background">
            <BuilderTopBar
                saving={saving}
                hasChanges={hasChanges}
                onSave={handleSave}
                canvasMode={canvasMode}
                onCanvasModeChange={setCanvasMode}
                onPreviewPdf={handlePreviewPdf}
                previewingPdf={previewingPdf}
            />

            {/* Middle row: sidebar (edit mode only) + canvas */}
            <div className="flex-1 flex min-h-0">
                {canvasMode === "edit" && (
                    <BuilderSidebar
                        templateId={templateId}
                        meta={meta}
                        sections={schema.sections}
                        currentSectionIndex={safePageIndex}
                        onUpdateMeta={handleUpdateMeta}
                        onNavigate={goToPage}
                        onAddSection={handleAddSection}
                        onReorderSections={handleReorderSections}
                    />
                )}

                <CanvasProvider value={{ actions: canvasActions, mode: canvasMode }}>
                    <BuilderCanvas
                        schema={schema}
                        currentPageIndex={safePageIndex}
                        direction={page.direction}
                    />
                </CanvasProvider>
            </div>

            {canvasMode === "preview" && (
                <PreviewWizardNav
                    currentIndex={safePageIndex}
                    totalSections={schema.sections.length}
                    onPrev={() => goToPage(safePageIndex - 1)}
                    onNext={() => goToPage(safePageIndex + 1)}
                />
            )}
        </div>
    );
}

/**
 * Pull the assigned tenant's branding (logo, cover, contact info, etc.) so the
 * "Preview as PDF" button can render a realistic preview. Falls back to null
 * on any failure — the preview pipeline handles the missing-tenant case with
 * a generic sample tenant.
 */
async function fetchTenantBranding(tenantId: string): Promise<{
    company_name?: string | null;
    name?: string | null;
    logo_url?: string | null;
    report_cover_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    abn?: string | null;
    primary_color?: string | null;
} | null> {
    try {
        const res = await fetch(`/api/platform-admin/tenants/${tenantId}`);
        if (!res.ok) return null;
        const json = await res.json();
        // The single-tenant endpoint returns `{ item: ... }` shape.
        return json.item ?? json ?? null;
    } catch {
        return null;
    }
}
