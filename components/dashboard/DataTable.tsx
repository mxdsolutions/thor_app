"use client";

import { ReactNode } from "react";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
} from "@/lib/design-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight as ArrowUpRightIcon } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";

/* ── Column definition ── */

export interface DataTableColumn<T> {
    /** Header label */
    label: string;
    /** Unique key for React keying */
    key: string;
    /** Render the cell content for a given row */
    render: (item: T) => ReactNode;
    /** Extra classes on <th> and <td> (e.g. "text-right", "hidden sm:table-cell") */
    className?: string;
    /** If true, uses the muted cell style (tableCellMuted) instead of default */
    muted?: boolean;
}

/* ── Component props ── */

interface DataTableProps<T extends { id: string }> {
    /** Array of items to render */
    items: T[];
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Loading state — shows skeleton rows */
    loading?: boolean;
    /** When set, renders an error row instead of items. Pass `swrResult.error` from SWR. */
    error?: unknown;
    /** Text shown when items is empty and not loading */
    emptyMessage?: string;
    /** Text shown when error is set (default: "Failed to load.") */
    errorMessage?: string;
    /** Number of skeleton rows to show while loading */
    skeletonRows?: number;
    /** Row click handler */
    onRowClick?: (item: T) => void;
    /** Show the hover-reveal arrow button on each row (default: true when onRowClick is set) */
    showRowAction?: boolean;
    /** Override the default arrow button with a custom per-row action (e.g. a kebab menu). When set, the action cell stays visible (no hover-reveal). */
    renderRowAction?: (item: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
    items,
    columns,
    loading,
    error,
    emptyMessage = "No items found.",
    errorMessage = "Failed to load.",
    skeletonRows = 8,
    onRowClick,
    showRowAction,
    renderRowAction,
}: DataTableProps<T>) {
    const hasAction = renderRowAction ? true : (showRowAction ?? !!onRowClick);
    const colCount = columns.length + (hasAction ? 1 : 0);

    return (
        <table className={tableBase + " border-collapse min-w-full"}>
            <thead className={tableHead + " sticky top-0 z-10"}>
                <tr>
                    {columns.map((col, i) => (
                        <th
                            key={col.key}
                            className={cn(
                                tableHeadCell,
                                i === 0
                                    ? "pl-4 md:pl-6 lg:pl-10 pr-4"
                                    : "px-4",
                                col.className,
                            )}
                        >
                            {col.label}
                        </th>
                    ))}
                    {hasAction && (
                        <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"} />
                    )}
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <TableSkeleton rows={skeletonRows} columns={colCount} />
                ) : error ? (
                    <tr>
                        <td colSpan={colCount} className="text-center py-12 text-sm text-rose-600">
                            {errorMessage}
                        </td>
                    </tr>
                ) : items.length === 0 ? (
                    <tr>
                        <td colSpan={colCount} className="text-center py-12 text-sm text-muted-foreground">
                            {emptyMessage}
                        </td>
                    </tr>
                ) : (
                    items.map((item) => (
                        <tr
                            key={item.id}
                            className={cn(
                                tableRow,
                                "group",
                                onRowClick && "cursor-pointer",
                            )}
                            onClick={onRowClick ? () => onRowClick(item) : undefined}
                        >
                            {columns.map((col, i) => (
                                <td
                                    key={col.key}
                                    className={cn(
                                        col.muted ? "p-3 text-muted-foreground" : tableCell,
                                        i === 0
                                            ? "pl-4 md:pl-6 lg:pl-10 pr-4"
                                            : "px-4",
                                        col.className,
                                    )}
                                >
                                    {col.render(item)}
                                </td>
                            ))}
                            {hasAction && (
                                <td
                                    className={cn(
                                        tableCell,
                                        "pl-4 pr-4 md:pr-6 lg:pr-10 text-right",
                                        !renderRowAction && "md:opacity-0 md:group-hover:opacity-100 transition-opacity",
                                    )}
                                >
                                    {renderRowAction ? (
                                        renderRowAction(item)
                                    ) : (
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}
