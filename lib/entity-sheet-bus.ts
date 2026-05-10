"use client";

import type { EntityPreviewType } from "@/lib/swr";

type SheetRequest = { type: EntityPreviewType; id: string };

const EVENT_NAME = "thor:open-entity-sheet";

function getBus(): EventTarget | null {
    if (typeof window === "undefined") return null;
    const w = window as typeof window & { __thorEntitySheetBus?: EventTarget };
    if (!w.__thorEntitySheetBus) {
        w.__thorEntitySheetBus = new EventTarget();
    }
    return w.__thorEntitySheetBus;
}

/** Open a related entity's side sheet in the global host (mounted in the
 *  dashboard layout). Stacks on top of any sheet already open. */
export function openEntitySheet(type: EntityPreviewType, id: string): void {
    const bus = getBus();
    if (!bus) return;
    bus.dispatchEvent(new CustomEvent<SheetRequest>(EVENT_NAME, { detail: { type, id } }));
}

/** Subscribe to entity-sheet open requests. Returns an unsubscribe fn. */
export function subscribeEntitySheet(handler: (req: SheetRequest) => void): () => void {
    const bus = getBus();
    if (!bus) return () => { /* noop on server */ };
    const listener = (e: Event) => {
        const detail = (e as CustomEvent<SheetRequest>).detail;
        if (detail) handler(detail);
    };
    bus.addEventListener(EVENT_NAME, listener);
    return () => bus.removeEventListener(EVENT_NAME, listener);
}
