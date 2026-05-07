"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ArchiveScope } from "@/lib/swr";

/**
 * Combined status + archive scope filter.
 *
 * The archive scope is multiplexed into the same `<Select>` as the per-status
 * filter — three pseudo-options at the top (Active, Archived, All) sit above
 * a divider, then the entity's real status options follow. Selecting an
 * archive option clears the status filter; selecting a status implicitly uses
 * the currently-selected archive scope.
 *
 * Internal value encoding:
 *   - `__active__`  → scope=active, status="All"
 *   - `__archived__` → scope=archived, status="All"
 *   - `__all__`     → scope=all, status="All"
 *   - any other     → status=that, scope unchanged
 *
 * Callers manage `archive` and `status` as two separate pieces of state.
 */
interface Props {
    archive: ArchiveScope;
    onArchiveChange: (scope: ArchiveScope) => void;
    status: string; // "All" sentinel or a real status id
    onStatusChange: (status: string) => void;
    statuses: { id: string; label: string }[];
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
}

const SCOPE_VALUE = {
    active: "__active__",
    archived: "__archived__",
    all: "__all__",
} as const;

export function ArchiveScopedStatusSelect({
    archive,
    onArchiveChange,
    status,
    onStatusChange,
    statuses,
    placeholder = "Status",
    className,
    triggerClassName = "w-[160px]",
}: Props) {
    // Derive the current select value: archive scope wins when status is "All",
    // otherwise we display the chosen status.
    const currentValue =
        status === "All" ? SCOPE_VALUE[archive] : status;

    const handleChange = (val: string) => {
        if (val === SCOPE_VALUE.active) { onArchiveChange("active"); onStatusChange("All"); return; }
        if (val === SCOPE_VALUE.archived) { onArchiveChange("archived"); onStatusChange("All"); return; }
        if (val === SCOPE_VALUE.all) { onArchiveChange("all"); onStatusChange("All"); return; }
        onStatusChange(val);
    };

    return (
        <Select value={currentValue} onValueChange={handleChange}>
            <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className={className}>
                <SelectItem value={SCOPE_VALUE.active}>Active</SelectItem>
                <SelectItem value={SCOPE_VALUE.archived}>Archived</SelectItem>
                <SelectItem value={SCOPE_VALUE.all}>All</SelectItem>
                {statuses.length > 0 && <SelectSeparator />}
                {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
