"use client";

import { ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
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
    subtitle?: string | null;
    badge?: {
        label: string;
        dotColor: string;
    };
    actions?: ReactNode;
    /** Optional banner rendered between the header and the tab strip — used for
     *  archived / read-only / status notices. */
    banner?: ReactNode;
    footer?: ReactNode;
    /** Extra classes for the footer wrapper — handy for `md:hidden` etc. */
    footerClassName?: string;
    contentClassName?: string;
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    children: ReactNode;
}

/** Reusable side sheet layout with header (icon, title, badge), tab navigation, and scrollable content area. */
export function SideSheetLayout({
    open,
    onOpenChange,
    icon,
    iconBg,
    title,
    subtitle,
    badge,
    actions,
    banner,
    footer,
    footerClassName,
    contentClassName,
    tabs,
    activeTab,
    onTabChange,
    children,
}: SideSheetLayoutProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className={cn("w-full sm:max-w-[900px] flex flex-col p-0 border-l border-border bg-background", contentClassName)}>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className={cn("w-[60px] h-[60px] rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="font-statement text-[22px] font-extrabold tracking-tight truncate leading-tight">{title}</SheetTitle>
                            <SheetDescription className="sr-only">{subtitle || title}</SheetDescription>
                            {(badge || actions) && (
                                <div className="flex items-center justify-between gap-3 mt-[2px]">
                                    <div className="flex items-center gap-2">
                                        {badge && (
                                            <span className="inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider bg-secondary text-foreground">
                                                <span className={cn("w-2 h-2 rounded-full mr-2", badge.dotColor)} />
                                                {badge.label}
                                            </span>
                                        )}
                                        {subtitle && (
                                            <span className="text-sm text-muted-foreground">
                                                {badge && "·"} {subtitle}
                                            </span>
                                        )}
                                    </div>
                                    {actions && (
                                        <div className="flex items-center gap-2">
                                            {actions}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </SheetHeader>
                </div>

                {banner}

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={cn(
                                        "pb-3 text-[17px] font-medium transition-colors relative focus:outline-none",
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

                    {footer && (
                        <div className={cn("p-4 border-t border-border bg-background shrink-0", footerClassName)}>
                            {footer}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
