"use client";

import { Sparkles } from "lucide-react";
import { useAssistant } from "./AssistantContext";
import { cn } from "@/lib/utils";

export function AssistantTrigger({ className }: { className?: string }) {
    const { open, toggle } = useAssistant();
    return (
        <button
            onClick={toggle}
            title={open ? "Close assistant" : "Open assistant"}
            aria-pressed={open}
            className={cn(
                "p-2 rounded-lg transition-colors relative",
                open
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                className
            )}
        >
            <Sparkles className="w-[20px] h-[20px]" strokeWidth={2} />
        </button>
    );
}
