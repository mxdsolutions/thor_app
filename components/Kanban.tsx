"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

export type KanbanItem = {
    id: string;
    title: string;
    [key: string]: any;
};

export type KanbanColumn = {
    id: string;
    label: string;
    color: string;
    accentBg?: string;
};

interface KanbanProps<T extends KanbanItem> {
    items: T[];
    columns: KanbanColumn[];
    getItemStatus: (item: T) => string;
    renderCard: (item: T) => React.ReactNode;
    onItemMove?: (itemId: string, fromColumn: string, toColumn: string, columnLabel: string) => void;
    onCardClick?: (item: T) => void;
    loading?: boolean;
}

function SkeletonCard() {
    return (
        <div className="rounded-xl bg-background p-4 space-y-3 animate-pulse">
            <div className="h-3.5 bg-muted rounded-full w-3/4" />
            <div className="h-3 bg-muted rounded-full w-1/2" />
            <div className="flex gap-2 pt-1">
                <div className="h-5 bg-muted rounded-full w-16" />
                <div className="h-5 bg-muted rounded-full w-12" />
            </div>
        </div>
    );
}

export function Kanban<T extends KanbanItem>({
    items,
    columns,
    getItemStatus,
    renderCard,
    onItemMove,
    onCardClick,
    loading = false,
}: KanbanProps<T>) {
    const [dragItemId, setDragItemId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const dragSourceColumn = useRef<string | null>(null);
    const didDrag = useRef(false);

    const handleDragStart = (e: React.DragEvent, itemId: string, columnId: string) => {
        didDrag.current = true;
        setDragItemId(itemId);
        dragSourceColumn.current = columnId;
        e.dataTransfer.effectAllowed = "move";
        // Make the drag image slightly transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
        }
    };

    const handleDragEnd = () => {
        setDragItemId(null);
        setDragOverColumn(null);
        dragSourceColumn.current = null;
        // Reset didDrag after a tick so onClick can check it
        setTimeout(() => { didDrag.current = false; }, 0);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const handleDragLeave = (e: React.DragEvent, columnId: string) => {
        // Only clear if we're actually leaving the column (not entering a child)
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        const currentTarget = e.currentTarget as HTMLElement;
        if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
            if (dragOverColumn === columnId) {
                setDragOverColumn(null);
            }
        }
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (dragItemId && dragSourceColumn.current && dragSourceColumn.current !== columnId) {
            const column = columns.find(c => c.id === columnId);
            onItemMove?.(dragItemId, dragSourceColumn.current, columnId, column?.label || columnId);
        }
        setDragItemId(null);
        setDragOverColumn(null);
        dragSourceColumn.current = null;
    };

    return (
        <div className="flex-1 min-h-0 overflow-x-auto px-4 md:px-6 lg:px-10">
            <div className="inline-flex gap-3 pb-4 h-[calc(100vh-220px)]">
                {columns.map((column) => {
                    const columnItems = items.filter(
                        (item) => getItemStatus(item) === column.id
                    );
                    const isOver = dragOverColumn === column.id && dragSourceColumn.current !== column.id;

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                "flex flex-col w-72 shrink-0 rounded-2xl bg-muted/40 overflow-hidden transition-all duration-200",
                                isOver && "ring-2 ring-primary/20 bg-primary/[0.03]"
                            )}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={(e) => handleDragLeave(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column accent bar */}
                            <div className={cn("h-1 w-full shrink-0 transition-colors duration-200", column.color)} />

                            {/* Column Header */}
                            <div className="px-4 pt-4 pb-3 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                                            {column.label}
                                        </h3>
                                    </div>
                                    <span className={cn(
                                        "text-[11px] font-bold tabular-nums min-w-[22px] h-[22px] flex items-center justify-center rounded-md",
                                        columnItems.length > 0
                                            ? "text-muted-foreground bg-background"
                                            : "text-muted-foreground/50"
                                    )}>
                                        {loading ? "\u2014" : columnItems.length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className={cn(
                                "flex-1 min-h-0 overflow-y-auto px-2.5 pb-2.5 space-y-2 transition-colors duration-200",
                                isOver && columnItems.length === 0 && "flex items-center justify-center"
                            )}>
                                {loading ? (
                                    <>
                                        <SkeletonCard />
                                        <SkeletonCard />
                                    </>
                                ) : columnItems.length === 0 ? (
                                    <div className={cn(
                                        "flex flex-col items-center justify-center py-12 px-4 transition-all duration-200",
                                        isOver && "py-6"
                                    )}>
                                        {isOver ? (
                                            <div className="border-2 border-dashed border-primary/30 rounded-xl w-full p-6 flex items-center justify-center">
                                                <p className="text-xs font-medium text-primary/60">Drop here</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center mb-3">
                                                    <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground/50 font-medium">
                                                    No items yet
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {columnItems.map((item) => (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item.id, column.id)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => {
                                                    if (!didDrag.current && onCardClick) {
                                                        onCardClick(item);
                                                    }
                                                }}
                                                className={cn(
                                                    "rounded-xl bg-background p-4 cursor-grab transition-all duration-200",
                                                    "border border-transparent",
                                                    "hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:border-border/80",
                                                    "active:cursor-grabbing active:scale-[0.98]",
                                                    dragItemId === item.id && "opacity-40 scale-[0.96] shadow-none"
                                                )}
                                            >
                                                {renderCard(item)}
                                            </div>
                                        ))}
                                        {isOver && (
                                            <div className="border-2 border-dashed border-primary/30 rounded-xl w-full p-6 flex items-center justify-center">
                                                <p className="text-xs font-medium text-primary/60">Drop here</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
