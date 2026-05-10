"use client";

import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface TablePaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

// API list endpoints return Postgres' `estimated` count (pg_class.reltuples)
// for performance. The estimate is accurate for small tables but rounded for
// larger ones, so we label totals above this threshold as approximate.
const APPROX_THRESHOLD = 1000;

export function TablePagination({ page, pageSize, total, onPageChange }: TablePaginationProps) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, total);
    const totalLabel = total > APPROX_THRESHOLD
        ? `~${total.toLocaleString()}`
        : total.toLocaleString();

    return (
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-10 py-3 border-t border-border/50 bg-background">
            <span className="text-xs text-muted-foreground">
                {from}–{to} of {totalLabel}
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    <IconChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                    {page + 1} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page >= totalPages - 1}
                    onClick={() => onPageChange(page + 1)}
                >
                    <IconChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
