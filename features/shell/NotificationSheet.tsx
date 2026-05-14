"use client";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Bell as BellIcon } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "./use-notifications";

interface NotificationSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notifications: Notification[];
    unreadCount: number;
    onMarkAllRead: () => void;
    onMarkOneRead: (id: string) => void;
}

export function NotificationSheet({
    open,
    onOpenChange,
    notifications,
    unreadCount,
    onMarkAllRead,
    onMarkOneRead,
}: NotificationSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0 border-l border-border bg-background">
                <SheetHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                    <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Mark all read
                        </button>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <BellIcon className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm text-muted-foreground">No notifications</p>
                            <p className="text-xs text-muted-foreground/50 mt-1">You&apos;re all caught up</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => { if (!n.read) onMarkOneRead(n.id); }}
                                    className={cn(
                                        "w-full text-left px-5 py-3.5 transition-colors hover:bg-muted/50",
                                        !n.read && "bg-primary/5"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {!n.read ? (
                                            <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                                        ) : (
                                            <span className="w-2 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">{n.title}</p>
                                            {n.body && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                            )}
                                            <p className="text-[11px] text-muted-foreground/50 mt-1.5">{timeAgo(n.created_at)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
