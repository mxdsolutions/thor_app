"use client";

import { useAssistant } from "./AssistantContext";

export function AssistantFab() {
    const { open, toggle } = useAssistant();
    if (open) return null;
    return (
        <button
            onClick={toggle}
            aria-label="Open assistant"
            className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-foreground shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
            <span className="relative inline-flex items-start leading-none">
                <span className="font-paladins text-[34px] leading-none bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-500">
                    T
                </span>
                <span className="font-sans text-[10px] font-bold leading-none ml-[2px] mt-[2px] tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-400">
                    AI
                </span>
            </span>
        </button>
    );
}
