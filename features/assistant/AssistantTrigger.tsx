"use client";

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
                "group p-2 rounded-[4px] relative bg-foreground transition-all duration-200",
                open
                    ? "ring-1 ring-foreground ring-offset-2 ring-offset-background shadow-sm scale-[1.02]"
                    : "hover:scale-[1.02]",
                className
            )}
        >
            <span className="relative inline-flex items-start leading-none w-[22px] h-[22px] justify-center">
                <span
                    className={cn(
                        "font-paladins text-[24px] leading-none bg-clip-text text-transparent bg-gradient-to-b transition-colors",
                        open
                            ? "from-zinc-100 via-zinc-300 to-zinc-500"
                            : "from-zinc-300 via-zinc-500 to-zinc-700 group-hover:from-zinc-200 group-hover:via-zinc-400 group-hover:to-zinc-600"
                    )}
                >
                    T
                </span>
                <span
                    className={cn(
                        "font-sans text-[7px] font-bold leading-none ml-[1px] mt-[1px] tracking-tight bg-clip-text text-transparent bg-gradient-to-b transition-colors",
                        open
                            ? "from-zinc-100 to-zinc-400"
                            : "from-zinc-400 to-zinc-700 group-hover:from-zinc-300 group-hover:to-zinc-600"
                    )}
                >
                    AI
                </span>
            </span>
        </button>
    );
}
