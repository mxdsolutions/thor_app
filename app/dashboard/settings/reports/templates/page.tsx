"use client";

import { useMemo, useState } from "react";
import {
    Plus as PlusIcon,
    Search as MagnifyingGlassIcon,
    FileText as FileTextIcon,
    Loader2 as LoaderIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { useReportTemplates } from "@/lib/swr";
import { useTenant } from "@/lib/tenant-context";
import { TEMPLATE_CATEGORIES } from "@/lib/report-templates/types";
import { CreateReportTemplateModal } from "@/components/modals/CreateReportTemplateModal";

interface TemplateListItem {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    tenant_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    created_by: string | null;
    creator: { id: string; full_name: string | null; email: string | null } | null;
}

type StatusFilter = "active" | "inactive" | "all";

const CATEGORY_LABEL = new Map<string, string>(
    TEMPLATE_CATEGORIES.map((c) => [c.value, c.label]),
);

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "all", label: "All Statuses" },
];

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

/**
 * Settings → Reports → Templates list. Filters / status toggle / open in
 * builder. The status switch at the end of each row patches the template's
 * `is_active`; deactivating requires a confirmation (the template may already
 * be in use on reports) but activating is a single click.
 */
export default function ReportTemplatesPage() {
    const tenant = useTenant();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [createOpen, setCreateOpen] = useState(false);

    // Pending deactivation — set when the user toggles an active row off.
    // null while no confirmation is pending.
    const [pendingDeactivate, setPendingDeactivate] = useState<TemplateListItem | null>(null);
    // Set of template ids currently being PATCHed so we can disable their
    // switches and show a spinner.
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    const { data, mutate, isLoading } = useReportTemplates(statusFilter);

    const templates: TemplateListItem[] = useMemo(() => {
        const raw = ((data?.items as TemplateListItem[]) || []).filter(
            (t) => t.tenant_id !== null,
        );
        const q = search.trim().toLowerCase();
        return raw.filter((t) => {
            if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
            if (q && !t.name.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) {
                return false;
            }
            return true;
        });
    }, [data, search, categoryFilter]);

    const handleCreated = (item: Record<string, unknown>) => {
        mutate();
        const id = typeof item?.id === "string" ? item.id : null;
        if (id) window.open(`/builder/${id}`, "_blank", "noopener");
    };

    const openInNewTab = (id: string) => window.open(`/builder/${id}`, "_blank", "noopener");

    const setActiveOnServer = async (templateId: string, isActive: boolean) => {
        setTogglingIds((prev) => new Set(prev).add(templateId));
        try {
            const res = await fetch(`/api/report-templates/${templateId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: isActive }),
            });
            if (!res.ok) throw new Error("Failed to update template");
            toast.success(isActive ? "Template activated" : "Template deactivated");
            mutate();
        } catch {
            toast.error("Couldn't update template status");
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(templateId);
                return next;
            });
        }
    };

    const handleToggle = (template: TemplateListItem) => {
        if (template.is_active) {
            // Deactivating an active template → confirm first.
            setPendingDeactivate(template);
            return;
        }
        // Activating is safe — fire straight through.
        void setActiveOnServer(template.id, true);
    };

    const filtersActive =
        search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "active";

    return (
        <div className="space-y-6">
            {/* Section header */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Report Templates</h2>
                <Button onClick={() => setCreateOpen(true)} className="shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Template
                </Button>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        className="pl-9 rounded-xl border-border/50 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {TEMPLATE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="-mx-2 md:mx-0">
                <table className={tableBase + " border-collapse"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-3 pr-3"}>Template</th>
                            <th className={tableHeadCell + " px-3 hidden sm:table-cell"}>Category</th>
                            <th className={tableHeadCell + " px-3 hidden lg:table-cell"}>Created by</th>
                            <th className={tableHeadCell + " px-3 hidden md:table-cell"}>Updated</th>
                            <th className={tableHeadCell + " pl-3 pr-3 text-right"}>Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            [0, 1, 2].map((i) => (
                                <tr key={i} className="border-b border-border/40">
                                    <td className={tableCell + " pl-3 pr-3"}>
                                        <div className="h-4 w-48 bg-muted/40 animate-pulse rounded" />
                                    </td>
                                    <td className={tableCell + " px-3 hidden sm:table-cell"}>
                                        <div className="h-3 w-20 bg-muted/30 animate-pulse rounded" />
                                    </td>
                                    <td className={tableCell + " px-3 hidden lg:table-cell"}>
                                        <div className="h-3 w-28 bg-muted/30 animate-pulse rounded" />
                                    </td>
                                    <td className={tableCell + " px-3 hidden md:table-cell"}>
                                        <div className="h-3 w-24 bg-muted/30 animate-pulse rounded" />
                                    </td>
                                    <td className={tableCell + " pl-3 pr-3 text-right"}>
                                        <div className="h-5 w-9 bg-muted/30 animate-pulse rounded-full inline-block" />
                                    </td>
                                </tr>
                            ))
                        ) : templates.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center">
                                    <EmptyState
                                        filtersActive={filtersActive}
                                        onClear={() => {
                                            setSearch("");
                                            setCategoryFilter("all");
                                            setStatusFilter("active");
                                        }}
                                        onCreate={() => setCreateOpen(true)}
                                    />
                                </td>
                            </tr>
                        ) : (
                            templates.map((t) => {
                                const categoryLabel = t.category
                                    ? CATEGORY_LABEL.get(t.category) ?? t.category.replace(/_/g, " ")
                                    : null;
                                const updatedDate = t.updated_at ?? t.created_at;
                                const creatorName = t.creator?.full_name || t.creator?.email || "—";
                                return (
                                    <tr
                                        key={t.id}
                                        className={tableRow + " cursor-pointer"}
                                        onClick={() => openInNewTab(t.id)}
                                    >
                                        <td className={tableCell + " pl-3 pr-3"}>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{t.name}</p>
                                                {t.description && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-md">
                                                        {t.description}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-3 hidden sm:table-cell text-sm"}>
                                            {categoryLabel ?? "—"}
                                        </td>
                                        <td className={tableCellMuted + " px-3 hidden lg:table-cell text-sm truncate max-w-[180px]"}>
                                            {creatorName}
                                        </td>
                                        <td className={tableCellMuted + " px-3 hidden md:table-cell text-sm"}>
                                            {dateFormatter.format(new Date(updatedDate))}
                                        </td>
                                        <td
                                            className={tableCell + " pl-3 pr-3 text-right"}
                                            // Stop the row's click handler from firing when the user
                                            // clicks the switch — the switch has its own behaviour.
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Switch
                                                checked={t.is_active}
                                                onCheckedChange={() => handleToggle(t)}
                                                busy={togglingIds.has(t.id)}
                                                ariaLabel={t.is_active ? "Deactivate template" : "Activate template"}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <CreateReportTemplateModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                enforceTenantId={tenant.id}
                onCreated={handleCreated}
            />

            <DeactivateConfirmDialog
                template={pendingDeactivate}
                onClose={() => setPendingDeactivate(null)}
                onConfirm={async (templateId) => {
                    setPendingDeactivate(null);
                    await setActiveOnServer(templateId, false);
                }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Switch — small inline toggle. Not promoted to components/ui yet    */
/*  because this is its only consumer; lift if a second one shows up.  */
/* ------------------------------------------------------------------ */

function Switch({
    checked,
    onCheckedChange,
    busy,
    ariaLabel,
}: {
    checked: boolean;
    onCheckedChange: () => void;
    busy?: boolean;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={busy}
            onClick={onCheckedChange}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                checked ? "bg-foreground" : "bg-muted",
                busy && "opacity-60 cursor-wait",
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full bg-background shadow-sm transition-transform",
                    checked ? "translate-x-[18px]" : "translate-x-[2px]",
                )}
            >
                {busy && <LoaderIcon className="w-2.5 h-2.5 animate-spin text-muted-foreground" />}
            </span>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Deactivate confirmation                                            */
/* ------------------------------------------------------------------ */

function DeactivateConfirmDialog({
    template,
    onClose,
    onConfirm,
}: {
    template: TemplateListItem | null;
    onClose: () => void;
    onConfirm: (templateId: string) => Promise<void> | void;
}) {
    const open = template !== null;
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Deactivate template?</DialogTitle>
                    <DialogDescription>
                        {template ? (
                            <>
                                <span className="font-medium text-foreground">{template.name}</span>{" "}
                                will be hidden from the &ldquo;New Report&rdquo; modal. Existing reports
                                using this template stay readable.
                            </>
                        ) : null}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <p className="text-xs text-muted-foreground">
                        You can reactivate it any time from the Inactive filter.
                    </p>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => template && onConfirm(template.id)}
                    >
                        Deactivate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
    filtersActive,
    onClear,
    onCreate,
}: {
    filtersActive: boolean;
    onClear: () => void;
    onCreate: () => void;
}) {
    if (filtersActive) {
        return (
            <div className="space-y-3">
                <p className="text-sm font-medium">No templates match your filters</p>
                <button
                    onClick={onClear}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                    Clear filters
                </button>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <FileTextIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-semibold">No templates yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Create your first template to define the questions your team will answer.
                </p>
            </div>
            <Button onClick={onCreate} size="sm" className="mt-2">
                <PlusIcon className="w-4 h-4 mr-2" />
                New Template
            </Button>
        </div>
    );
}
