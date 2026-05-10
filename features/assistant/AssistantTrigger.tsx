"use client";

import { useAssistant } from "./AssistantContext";
import { ThorMark } from "@/features/shell/ThorMark";
import { cn } from "@/lib/utils";

export function AssistantTrigger({ className }: { className?: string }) {
    const { open, toggle } = useAssistant();
    return (
        <button
            onClick={toggle}
            title={open ? "Close assistant" : "Open assistant"}
            aria-pressed={open}
            className={cn(
                "w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors",
                open
                    ? "bg-secondary text-foreground"
                    : "hover:bg-secondary",
                className,
            )}
        >
            <ThorMark size={24} withAI surface="light" />
        </button>
    );
}
