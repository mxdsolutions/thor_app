"use client";

import { IconLayoutSidebarRightExpand, IconLayoutSidebarRightCollapse } from "@tabler/icons-react";
import { useAssistant } from "./AssistantContext";
import { cn } from "@/lib/utils";

export function AssistantTrigger({ className }: { className?: string }) {
    const { open, toggle } = useAssistant();
    const Icon = open ? IconLayoutSidebarRightCollapse : IconLayoutSidebarRightExpand;
    return (
        <button
            onClick={toggle}
            title={open ? "Close assistant" : "Open assistant"}
            aria-pressed={open}
            className={cn(
                "p-2 rounded-lg transition-colors relative hover:bg-secondary",
                open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                className
            )}
        >
            <Icon className="w-[26px] h-[26px]" />
        </button>
    );
}
