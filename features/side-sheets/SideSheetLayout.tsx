"use client";

import { ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = {
    id: string;
    label: string;
};

interface SideSheetLayoutProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    icon: ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    badge?: {
        label: string;
        dotColor: string;
    };
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    children: ReactNode;
}

export function SideSheetLayout({
    open,
    onOpenChange,
    icon,
    iconBg,
    title,
    subtitle,
    badge,
    tabs,
    activeTab,
    onTabChange,
    children,
}: SideSheetLayoutProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-lg font-bold truncate">{title}</SheetTitle>
                                {badge && (
                                    <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", badge.dotColor)} />
                                        {badge.label}
                                    </Badge>
                                )}
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                {subtitle}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {children}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
