"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
    IconArchive,
    IconArchiveOff,
    IconDotsVertical,
} from "@tabler/icons-react";
import { toast } from "sonner";

interface UseArchiveActionOptions {
    /** Lowercase singular noun, e.g. "quote", "contact". Used in menu + banner copy. */
    entityName: string;
    /** Full archive endpoint URL, e.g. `/api/quotes/${id}/archive`. */
    endpoint: string;
    /** Whether the entity is currently archived. */
    archived: boolean;
    /** Called with the new `archived_at` value (ISO string when archived, null when restored). */
    onArchived: (archivedAt: string | null) => void;
}

/**
 * Returns ready-to-render `menu` (kebab Popover) and `banner` (above-tabs strip)
 * elements for any side sheet that needs an Archive / Restore control.
 *
 * Wires the entity-specific archive endpoint, surfaces a toast on failure, and
 * propagates the new `archived_at` to the caller's local state.
 */
export function useArchiveAction({
    entityName,
    endpoint,
    archived,
    onArchived,
}: UseArchiveActionOptions) {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggle = useCallback(async (next: boolean) => {
        const res = await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: next }),
        });
        if (!res.ok) {
            toast.error(`Failed to ${next ? "archive" : "restore"} ${entityName}`);
            return;
        }
        const json = await res.json().catch(() => ({}));
        const archivedAt: string | null = json.item?.archived_at
            ?? (next ? new Date().toISOString() : null);
        onArchived(archivedAt);
        toast.success(next ? `${capitalise(entityName)} archived` : `${capitalise(entityName)} restored`);
    }, [endpoint, entityName, onArchived]);

    const menu = (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-9 w-9 px-0"
                    aria-label="More actions"
                >
                    <IconDotsVertical className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
                <button
                    type="button"
                    onClick={() => {
                        setMenuOpen(false);
                        void toggle(!archived);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary text-foreground transition-colors"
                >
                    {archived ? (
                        <>
                            <IconArchiveOff className="w-4 h-4" />
                            Restore {entityName}
                        </>
                    ) : (
                        <>
                            <IconArchive className="w-4 h-4" />
                            Archive {entityName}
                        </>
                    )}
                </button>
            </PopoverContent>
        </Popover>
    );

    const banner = archived ? (
        <div className="px-6 py-2.5 bg-muted border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconArchive className="w-4 h-4" />
                <span>This {entityName} is archived.</span>
            </div>
            <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3"
                onClick={() => void toggle(false)}
            >
                Restore
            </Button>
        </div>
    ) : null;

    return { menu, banner, toggle };
}

function capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
