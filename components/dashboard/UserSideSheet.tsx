"use client";

import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn, getDisplayName, getInitials, type AppUser } from "@/lib/utils";

interface UserSideSheetProps {
    user: AppUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserSideSheet({ user, open, onOpenChange }: UserSideSheetProps) {
    const [activeTab, setActiveTab] = useState("profile");

    // Reset tab to profile when user changes
    require("react").useEffect(() => {
        if (user?.id) {
            setActiveTab("profile");
        }
    }, [user?.id]);

    if (!user) return null;

    const userType = user.user_metadata.user_type || "member";

    const memberTabs = [
        { id: "profile", label: "Profile" },
        { id: "projects", label: "Projects" },
        { id: "jobs", label: "Jobs" },
        { id: "activity", label: "Activity" },
    ];

    const adminTabs = [
        { id: "profile", label: "Profile" },
    ];

    const tabs = userType === "admin" ? adminTabs : memberTabs;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center font-bold text-lg text-foreground ring-1 ring-border/50 shrink-0 mt-1">
                            {getInitials(user)}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center justify-between gap-4">
                                <SheetTitle className="text-2xl font-bold truncate">{getDisplayName(user)}</SheetTitle>
                                <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider shrink-0">
                                    {userType}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1 truncate">{user.email}</SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus-visible:outline-none focus:outline-none",
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
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-none overflow-hidden">
                            <h3 className="text-lg font-semibold mb-4 capitalize">
                                {tabs.find((t) => t.id === activeTab)?.label}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Content for {activeTab} goes here.
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
