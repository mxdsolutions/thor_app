"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useTenant, usePermission } from "@/lib/tenant-context";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRightStartOnRectangleIcon,
    Bars2Icon,
    XMarkIcon,
    EnvelopeIcon,
    BellIcon,
} from "@heroicons/react/24/outline";

import {
    WORKSPACES,
    getSettingsItems,
    getItemsForWorkspace,
    getWorkspaceForPath,
    type Workspace,
} from "@/features/shell/nav-config";
import { useNotifications } from "@/features/shell/use-notifications";
import { useUserProfile } from "@/features/shell/use-user-profile";
import { NotificationSheet } from "@/features/shell/NotificationSheet";
import { SignOutDialog } from "@/features/shell/SignOutDialog";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(() => getWorkspaceForPath(pathname));
    const [notifOpen, setNotifOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => { navRef.current?.scrollTo(0, 0); }, [activeWorkspace]);
    useEffect(() => { setActiveWorkspace(getWorkspaceForPath(pathname)); }, [pathname]);

    // Tenant context (optional)
    let tenant: ReturnType<typeof useTenant> | null = null;
    try { tenant = useTenant(); } catch { /* no provider */ }

    // Permission checks
    let hasCrmAccess = true, hasOperationsAccess = true, hasFinanceAccess = true, hasSettingsAccess = true;
    let hasBrandingAccess = false, hasRolesAccess = false, hasDomainAccess = false;
    try {
        hasCrmAccess = usePermission("crm", "read");
        hasOperationsAccess = usePermission("operations", "read");
        hasFinanceAccess = usePermission("finance", "read");
        hasSettingsAccess = usePermission("settings", "read");
        hasBrandingAccess = usePermission("settings.branding", "read");
        hasRolesAccess = usePermission("settings.users", "write");
        hasDomainAccess = tenant?.role === "owner";
    } catch { /* defaults */ }

    const { initials, displayName, email: userEmail } = useUserProfile();
    const { notifications, unreadCount, markAllRead, markOneRead, refresh: refreshNotifs } = useNotifications();

    const workspaces = WORKSPACES.filter(ws => {
        if (ws.id === "crm") return hasCrmAccess;
        if (ws.id === "operations") return hasOperationsAccess;
        if (ws.id === "finance") return hasFinanceAccess;
        if (ws.id === "settings") return hasSettingsAccess;
        return true;
    });

    const settingsItems = getSettingsItems({ hasBrandingAccess, hasRolesAccess, hasDomainAccess });
    const currentWorkspace = getWorkspaceForPath(pathname);
    const activeItems = getItemsForWorkspace(activeWorkspace, settingsItems);

    const switchWorkspace = (ws: Workspace) => {
        setActiveWorkspace(ws);
        const items = getItemsForWorkspace(ws, settingsItems);
        if (items.length > 0) router.push(items[0].href);
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Workspace Bar */}
            <div className="w-20 bg-black hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-border">
                <div className="h-16 flex items-center justify-center">
                    <Link href="/dashboard/operations/overview" className="flex items-center justify-center">
                        <Logo variant="dark" size="default" tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                    </Link>
                </div>

                <nav className="flex-1 flex flex-col items-center gap-4 py-6">
                    {workspaces.map((ws) => (
                        <button
                            key={ws.id}
                            onClick={() => switchWorkspace(ws.id)}
                            title={ws.label}
                            className={cn(
                                "p-3 rounded-xl transition-all duration-200",
                                currentWorkspace === ws.id ? "bg-white/10 text-white" : "text-white hover:bg-white/10"
                            )}
                        >
                            <ws.icon className="w-5 h-5" />
                        </button>
                    ))}
                </nav>

                <div className="pb-4 flex flex-col items-center gap-3">
                    <button
                        title="Notifications"
                        onClick={() => { setNotifOpen(true); refreshNotifs(); }}
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
                            <span className="text-xs font-bold text-violet-600">{initials}</span>
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
                <div className="h-16 px-6 flex items-center border-b border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {currentWorkspace.toUpperCase()}
                    </p>
                </div>
                <nav ref={navRef} className="flex-1 px-3 space-y-0.5 overflow-y-auto py-4">
                    {activeItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                )}
                            >
                                <item.icon className={cn("w-[18px] h-[18px] transition-transform duration-200", !isActive && "group-hover:scale-110")} />
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
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 w-72 bg-background z-50 md:hidden flex flex-col shadow-2xl border-r border-border"
                        >
                            <div className="h-14 flex items-center justify-between px-5 border-b border-border">
                                <h2 className="text-sm font-semibold">{currentWorkspace.toUpperCase()}</h2>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-3 py-4 border-b border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Workspaces</p>
                                <div className="space-y-2">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => { switchWorkspace(ws.id); setMobileMenuOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                                currentWorkspace === ws.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                            )}
                                        >
                                            <ws.icon className="w-[18px] h-[18px]" />
                                            {ws.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-4">
                                {activeItems.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                                                isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                            )}
                                        >
                                            <item.icon className={cn("w-[18px] h-[18px] transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="p-3 border-t border-border space-y-1">
                                <Link href="/dashboard/settings/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center ring-2 ring-border">
                                        <span className="text-xs font-bold text-violet-600">{initials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{displayName}</p>
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
                <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-20">
                    <Link href="/dashboard/operations/overview" className="flex items-center gap-2">
                        <Logo tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                    </Link>
                    <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
                        <Bars2Icon className="w-5 h-5" />
                    </button>
                </header>
                <div className="w-full pt-6 lg:pt-8 min-w-0">{children}</div>
            </main>

            <NotificationSheet
                open={notifOpen}
                onOpenChange={setNotifOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkOneRead={markOneRead}
            />
            <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
        </div>
    );
}
