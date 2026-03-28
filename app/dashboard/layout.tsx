"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn, timeAgo } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
    ArrowRightStartOnRectangleIcon,
    Squares2X2Icon,
    Bars2Icon,
    XMarkIcon,
    UsersIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    FunnelIcon,
    RocketLaunchIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    CogIcon,
    CubeIcon,
    EnvelopeIcon,
    LinkIcon,
    BellIcon,
} from "@heroicons/react/24/outline";

type Workspace = "crm" | "operations" | "settings";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("operations");
    const navRef = useRef<HTMLElement>(null);
    const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);

    useEffect(() => {
        navRef.current?.scrollTo(0, 0);
    }, [activeWorkspace]);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) return;
            supabase.from("profiles").select("full_name, email").eq("id", data.user.id).single().then(({ data: profile }) => {
                if (profile) setUserProfile(profile);
            });
        });
    }, []);

    const userInitials = (() => {
        const name = userProfile?.full_name;
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    })();
    const userDisplayName = userProfile?.full_name || "User";
    const userEmail = userProfile?.email || "";

    const workspaces: { id: Workspace; label: string; icon: any }[] = [
        { id: "crm", label: "CRM", icon: UserGroupIcon },
        { id: "operations", label: "Operations", icon: BriefcaseIcon },
        { id: "settings", label: "Settings", icon: CogIcon },
    ];

    const operationsItems = [
        { href: "/dashboard/operations/overview", label: "Overview", icon: Squares2X2Icon },
        { href: "/dashboard/operations/jobs", label: "Jobs", icon: BriefcaseIcon },
        { href: "/dashboard/operations/projects", label: "Projects", icon: ClipboardDocumentListIcon },
        { href: "/dashboard/operations/products", label: "Products", icon: CubeIcon },
        { href: "/dashboard/operations/resources", label: "Resources", icon: DocumentTextIcon },
    ];

    const crmItems = [
        { href: "/dashboard/crm/overview", label: "Overview", icon: Squares2X2Icon },
        { href: "/dashboard/crm/leads", label: "Leads", icon: FunnelIcon },
        { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: RocketLaunchIcon },
        { href: "/dashboard/crm/companies", label: "Companies", icon: BuildingOffice2Icon },
        { href: "/dashboard/crm/contacts", label: "Contacts", icon: UserGroupIcon },
    ];

    const settingsItems = [
        { href: "/dashboard/settings/users", label: "Users", icon: UsersIcon },
        { href: "/dashboard/settings/integrations", label: "Integrations", icon: LinkIcon },
    ];

    const getItemsForWorkspace = (ws: Workspace) => {
        switch (ws) {
            case "crm":
                return crmItems;
            case "settings":
                return settingsItems;
            default:
                return operationsItems;
        }
    };

    const getActiveItems = () => getItemsForWorkspace(activeWorkspace);

    const switchWorkspace = (ws: Workspace) => {
        setActiveWorkspace(ws);
        const items = getItemsForWorkspace(ws);
        if (items.length > 0) {
            router.push(items[0].href);
        }
    };

    const getWorkspaceForPath = (): Workspace => {
        if (pathname.startsWith("/dashboard/crm")) {
            return "crm";
        }
        if (pathname.startsWith("/dashboard/settings")) {
            return "settings";
        }
        return "operations";
    };

    const currentWorkspace = getWorkspaceForPath();
    const activeItems = getActiveItems();

    // Notifications state
    type Notification = {
        id: string;
        type: string;
        title: string;
        body: string | null;
        entity_type: string | null;
        entity_id: string | null;
        read: boolean;
        created_at: string;
        creator?: { id: string; full_name: string | null; email: string | null } | null;
    };
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mark_all: true }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const markOneRead = async (id: string) => {
        try {
            await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notification_ids: [id] }),
            });
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Workspace Bar */}
            <div className="w-20 bg-black hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-border">
                {/* Logo area */}
                <div className="h-16 flex items-center justify-center">
                    <Link href="/dashboard/operations/overview" className="flex items-center justify-center">
                        <Logo variant="dark" size="default" />
                    </Link>
                </div>

                {/* Workspace buttons */}
                <nav className="flex-1 flex flex-col items-center gap-4 py-6">
                    {workspaces.map((ws) => {
                        const isActive = currentWorkspace === ws.id;
                        return (
                            <button
                                key={ws.id}
                                onClick={() => switchWorkspace(ws.id)}
                                title={ws.label}
                                className={cn(
                                    "p-3 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-white/10 text-white"
                                        : "text-white hover:bg-white/10"
                                )}
                            >
                                <ws.icon className="w-5 h-5" />
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="pb-4 flex flex-col items-center gap-3">
                    <button
                        title="Notifications"
                        onClick={() => { setNotifOpen(true); fetchNotifications(); }}
                        className="p-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors relative"
                    >
                        <BellIcon className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black" />
                        )}
                    </button>
                    <Link href="/dashboard/crm/emails" title="Emails" className="p-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                        <EnvelopeIcon className="w-5 h-5" />
                    </Link>
                    <Link href="/dashboard/settings/settings" title="Profile" className="p-3 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-violet-600">{userInitials}</span>
                        </div>
                    </Link>
                    <button
                        title="Sign out"
                        onClick={() => setSignOutOpen(true)}
                        className="p-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="w-64 bg-background hidden md:flex flex-col fixed inset-y-0 left-20 z-30 border-r border-border">
                {/* Section label */}
                <div className="h-16 px-6 flex items-center border-b border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {currentWorkspace.toUpperCase()}
                    </p>
                </div>

                {/* Navigation */}
                <nav ref={navRef} className="flex-1 px-3 space-y-0.5 overflow-y-auto py-4">
                    {activeItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                                    isActive
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-[18px] h-[18px] transition-transform duration-200",
                                    !isActive && "group-hover:scale-110"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        {/* Slide-in panel */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 w-72 bg-background z-50 md:hidden flex flex-col shadow-2xl border-r border-border"
                        >
                            {/* Header with close */}
                            <div className="h-14 flex items-center justify-between px-5 border-b border-border">
                                <h2 className="text-sm font-semibold">{currentWorkspace.toUpperCase()}</h2>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Workspace selector */}
                            <div className="px-3 py-4 border-b border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Workspaces</p>
                                <div className="space-y-2">
                                    {workspaces.map((ws) => {
                                        const isActive = currentWorkspace === ws.id;
                                        return (
                                            <button
                                                key={ws.id}
                                                onClick={() => {
                                                    switchWorkspace(ws.id);
                                                    setMobileMenuOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                                    isActive
                                                        ? "bg-secondary text-foreground"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                                )}
                                            >
                                                <ws.icon className="w-[18px] h-[18px]" />
                                                {ws.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nav */}
                            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-4">
                                {activeItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                                                isActive
                                                    ? "bg-secondary text-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "w-[18px] h-[18px] transition-transform duration-200",
                                                !isActive && "group-hover:scale-110"
                                            )} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Bottom */}
                            <div className="p-3 border-t border-border space-y-1">
                                <Link href="/dashboard/settings/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center ring-2 ring-border">
                                        <span className="text-xs font-bold text-violet-600">{userInitials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{userDisplayName}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
                                    </div>
                                </Link>
                                <button onClick={() => { setMobileMenuOpen(false); setSignOutOpen(true); }} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full">
                                    <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px]" />
                                    Sign out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <main className="flex-1 md:ml-[21rem] min-w-0 overflow-hidden">
                {/* Mobile header with hamburger */}
                <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-20">
                    <Link href="/dashboard/operations/overview" className="flex items-center gap-2">
                        <Logo />
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        aria-label="Open menu"
                    >
                        <Bars2Icon className="w-5 h-5" />
                    </button>
                </header>

                <div className="w-full pt-6 lg:pt-8 min-w-0">
                    {children}
                </div>
            </main>

            {/* Notifications side sheet */}
            <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
                <SheetContent side="left" className="w-full sm:max-w-sm flex flex-col p-0 border-r border-border bg-background">
                    <SheetHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                        <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
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
                                        onClick={() => { if (!n.read) markOneRead(n.id); }}
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

            {/* Sign out confirmation dialog */}
            <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sign out</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to sign out? You will need to sign in again to access the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={() => setSignOutOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="rounded-xl" onClick={() => signOut()}>
                            Sign out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
