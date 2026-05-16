"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityPreview, preloadEntityPreview, type EntityPreviewType } from "@/lib/swr";
import { useHoverCapability } from "@/lib/hooks/use-hover-capability";
import { openEntitySheet } from "@/lib/entity-sheet-bus";
import { EntityPreviewBody } from "./entity-preview-renderers";

const OPEN_DELAY_MS = 120;
// Generous close-delay (matches Radix HoverCard's own default) so a slow
// cursor traversing the trigger→content gap doesn't trip a premature close.
const CLOSE_DELAY_MS = 300;

interface EntityPreviewCardProps {
    entityType: EntityPreviewType;
    entityId: string | null | undefined;
    children: React.ReactNode;
    /** Disable the preview entirely (renders children unwrapped). */
    disabled?: boolean;
    /** Extra classes on the trigger wrapper. */
    className?: string;
    /** Side of the trigger to anchor against. Defaults to "bottom". */
    side?: "top" | "right" | "bottom" | "left";
}

const triggerBaseClass =
    "inline-flex items-center cursor-pointer underline-offset-2 rounded-sm focus:outline-none focus-visible:underline";

/** Inline preview card for a related entity. Hover on desktop, tap on mobile.
 *
 *  Performance shape:
 *  - **Idle wrapper** (before first interaction) is a plain `<span>` with a
 *    handful of event listeners — no Radix Popover scaffolding. A 50-row
 *    table with 100 wrappers pays only listener cost, not Popover.Root cost.
 *  - **First hover/tap prefetches** via SWR `preload` so the network request
 *    is in flight before the open-delay elapses; the popover usually renders
 *    with cached data already populated, no skeleton flash.
 *  - **HTTP `Cache-Control: private, max-age=30`** on the API means a second
 *    hover (or page navigation back) skips the network entirely.
 *  - **`useEntityPreview` only runs while the popover is open** — Radix only
 *    mounts `Content` when `open=true`, so the SWR hook isn't called for
 *    closed wrappers.
 */
export function EntityPreviewCard({
    entityType,
    entityId,
    children,
    disabled,
    className,
    side = "bottom",
}: EntityPreviewCardProps) {
    const hoverCapable = useHoverCapability();
    const [armed, setArmed] = React.useState(false);

    if (disabled || !entityId) {
        return <>{children}</>;
    }

    if (!armed) {
        return (
            <IdleTrigger
                entityType={entityType}
                entityId={entityId}
                hoverCapable={hoverCapable}
                onArm={() => setArmed(true)}
                className={cn(triggerBaseClass, className)}
            >
                {children}
            </IdleTrigger>
        );
    }

    return (
        <ArmedPopover
            entityType={entityType}
            entityId={entityId}
            hoverCapable={hoverCapable}
            side={side}
            className={cn(triggerBaseClass, className)}
        >
            {children}
        </ArmedPopover>
    );
}

/** Lightweight stand-in shown until the user first interacts. Dispatches a
 *  prefetch on hover/tap-down and signals the parent to swap in the real
 *  Popover. The Popover then immediately schedules its own open, so the
 *  user-perceived latency is unchanged. */
function IdleTrigger({
    entityType,
    entityId,
    hoverCapable,
    onArm,
    className,
    children,
}: {
    entityType: EntityPreviewType;
    entityId: string;
    hoverCapable: boolean;
    onArm: () => void;
    className: string;
    children: React.ReactNode;
}) {
    const stopRowClick = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
        <span
            role="button"
            tabIndex={0}
            className={className}
            onMouseEnter={() => {
                if (!hoverCapable) return;
                preloadEntityPreview(entityType, entityId);
                onArm();
            }}
            onPointerDown={(e) => {
                if (hoverCapable) return;
                stopRowClick(e);
                preloadEntityPreview(entityType, entityId);
                onArm();
            }}
            onFocus={() => {
                preloadEntityPreview(entityType, entityId);
                onArm();
            }}
            onClick={stopRowClick}
            onMouseDown={stopRowClick}
        >
            {children}
        </span>
    );
}

/** Full Radix Popover, only mounted after the user interacts with the
 *  trigger at least once. Auto-opens on mount because we know the user
 *  already showed intent. */
function ArmedPopover({
    entityType,
    entityId,
    hoverCapable,
    side,
    className,
    children,
}: {
    entityType: EntityPreviewType;
    entityId: string;
    hoverCapable: boolean;
    side: "top" | "right" | "bottom" | "left";
    className: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);
    const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    // Refs feed the close-time ":hover" sanity check below.
    const triggerRef = React.useRef<HTMLSpanElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    const clearTimers = React.useCallback(() => {
        if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }, []);

    React.useEffect(() => () => clearTimers(), [clearTimers]);

    // We were just armed by the user's first hover/tap — schedule the open
    // immediately so the popover appears at the same perceived latency as the
    // pre-defer implementation. On hover-capable devices we still respect the
    // open-delay so a stray sweep doesn't pop a card.
    React.useEffect(() => {
        if (hoverCapable) {
            openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
        } else {
            setOpen(true);
        }
        return clearTimers;
        // Run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scheduleOpen = () => {
        if (!hoverCapable) return;
        clearTimers();
        openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    };

    /**
     * When the close timer elapses, double-check that the cursor really isn't
     * over the trigger or content before committing to a close.
     *
     * Why: `mouseleave` can fire spuriously after the IdleTrigger → ArmedPopover
     * swap. The fresh trigger span appears *under* the cursor (instead of the
     * cursor entering it), so the browser never registered a paired `mouseenter`.
     * The next small movement can produce an unbalanced `mouseleave` while the
     * cursor is still genuinely over the trigger pixels. `element.matches(":hover")`
     * reflects the browser's real-time hit-test state and is immune to that
     * event-pairing edge case — if either ref is `:hover`, we keep the popover
     * open and let the next genuine departure schedule another close.
     */
    const scheduleClose = () => {
        if (!hoverCapable) return;
        clearTimers();
        closeTimer.current = setTimeout(() => {
            const stillHovered =
                triggerRef.current?.matches(":hover") ||
                contentRef.current?.matches(":hover");
            if (stillHovered) return;
            setOpen(false);
        }, CLOSE_DELAY_MS);
    };

    const stopRowClick = (e: React.SyntheticEvent) => e.stopPropagation();

    const handleTriggerClick = (e: React.MouseEvent) => {
        stopRowClick(e);
        if (!hoverCapable) {
            setOpen((prev) => !prev);
        }
    };

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
                <span
                    ref={triggerRef}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={scheduleOpen}
                    onMouseLeave={scheduleClose}
                    onMouseDown={stopRowClick}
                    onClick={handleTriggerClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            stopRowClick(e);
                            setOpen((prev) => !prev);
                        }
                    }}
                    className={className}
                >
                    {children}
                </span>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    ref={contentRef}
                    side={side}
                    align="start"
                    sideOffset={2}
                    collisionPadding={12}
                    onMouseEnter={scheduleOpen}
                    onMouseLeave={scheduleClose}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className={cn(
                        "z-50 w-[320px] rounded-2xl border border-border bg-card text-foreground shadow-lg outline-none overflow-hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                        "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
                    )}
                >
                    <PreviewBody
                        entityType={entityType}
                        entityId={entityId}
                        hoverCapable={hoverCapable}
                        onOpenSheet={() => {
                            setOpen(false);
                            openEntitySheet(entityType, entityId);
                        }}
                    />
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}

interface PreviewBodyProps {
    entityType: EntityPreviewType;
    entityId: string;
    hoverCapable: boolean;
    onOpenSheet: () => void;
}

function PreviewBody({ entityType, entityId, hoverCapable, onOpenSheet }: PreviewBodyProps) {
    const { data, error, isLoading, mutate } = useEntityPreview(entityType, entityId);

    return (
        <div className="flex flex-col">
            {isLoading && <PreviewSkeleton />}
            {!isLoading && error && (
                <div className="px-4 py-6 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Couldn&apos;t load preview.</p>
                    <button
                        type="button"
                        onClick={() => void mutate()}
                        className="text-xs font-medium text-foreground hover:underline"
                    >
                        Retry
                    </button>
                </div>
            )}
            {!isLoading && !error && data?.item && (
                <EntityPreviewBody type={entityType} item={data.item} />
            )}
            <div className="px-4 pt-2 pb-3 border-t border-border/60">
                <button
                    type="button"
                    onClick={onOpenSheet}
                    className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium",
                        "bg-foreground text-background hover:bg-foreground/90 transition-colors",
                        hoverCapable ? "h-8 px-3 ml-auto" : "h-10 w-full",
                    )}
                >
                    View more
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function PreviewSkeleton() {
    return (
        <>
            <div className="flex items-start gap-3 px-4 pt-4">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <div className="px-4 py-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
            </div>
        </>
    );
}
