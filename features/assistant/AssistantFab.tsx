"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useAssistant } from "./AssistantContext";

export function AssistantFab() {
    const { open, toggle } = useAssistant();
    if (open) return null;
    return (
        <button
            onClick={toggle}
            aria-label="Open assistant"
            className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
            <IconSparkles className="w-6 h-6" />
        </button>
    );
}
