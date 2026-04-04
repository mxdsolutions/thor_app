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
    ShieldCheckIcon,
    UserCircleIcon,
    ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

import {
    WORKSPACES,
    getSettingsItems,
    getItemsForWorkspace,
    getWorkspaceForPath,
    filterItemsByModules,
    type Workspace,
} from "@/features/shell/nav-config";
import { useTenantModules } from "@/lib/swr";
import { buildEnabledSet } from "@/lib/module-config";
import { useNotifications } from "@/features/shell/use-notifications";
import { useUserProfile } from "@/features/shell/use-user-profile";
import { NotificationSheet } from "@/features/shell/NotificationSheet";
import { SignOutDialog } from "@/features/shell/SignOutDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTitleProvider, useCurrentPageTitle } from "@/lib/page-title-context";

function PageTitle() {
    const title = useCurrentPageTitle();
    if (!title) return null;
    return <h1 className="text-lg font-semibold tracking-tight">{title}</h1>;
}

export function DashboardShell({ children, showPlatformAdminLink = false }: { children: React.ReactNode; showPlatformAdminLink?: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(() => getWorkspaceForPath(pathname));
    const [notifOpen, setNotifOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => { navRef.current?.scrollTo(0, 0); }, [activeWorkspace]);
    useEffect(() => { setActiveWorkspace(getWorkspaceForPath(pathname)); }, [pathname]);
    useEffect(() => {
        if (!avatarMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) setAvatarMenuOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [avatarMenuOpen]);

    // Tenant context (optional)
    let tenant: ReturnType<typeof useTenant> | null = null;
    try { tenant = useTenant(); } catch { /* no provider */ }

    // Permission checks
    let hasCrmAccess = true, hasOperationsAccess = true, hasFinanceAccess = true, hasSettingsAccess = true;
    let hasBrandingAccess = false, hasRolesAccess = false, hasDomainAccess = false;
    try {
        hasCrmAccess = usePermission("crm", "read");
        hasOperationsAccess = usePermission("operations", "read");
        hasFinanceAccess = hasOperationsAccess;
        hasSettingsAccess = usePermission("settings", "read");
        hasBrandingAccess = usePermission("settings.branding", "read");
        hasRolesAccess = usePermission("settings.users", "write");
        hasDomainAccess = tenant?.role === "owner";
    } catch { /* defaults */ }

    const { initials, displayName, email: userEmail } = useUserProfile();
    const { notifications, unreadCount, markAllRead, markOneRead, refresh: refreshNotifs } = useNotifications();

    // Module access
    const { data: modulesData } = useTenantModules();
    const enabledModules = buildEnabledSet(modulesData?.modules ?? []);
    // Default to showing all while loading (no flash of hidden content)
    const modulesLoaded = !!modulesData;

    const workspaces = WORKSPACES.filter(ws => {
        if (ws.id === "crm") return hasCrmAccess && (!modulesLoaded || enabledModules.has("crm"));
        if (ws.id === "operations") return hasOperationsAccess && (!modulesLoaded || enabledModules.has("operations"));
        if (ws.id === "finance") return hasFinanceAccess && (!modulesLoaded || enabledModules.has("finance"));
        if (ws.id === "settings") return hasSettingsAccess;
        return true;
    });

    const settingsItems = getSettingsItems({ hasBrandingAccess, hasRolesAccess, hasDomainAccess });
    const currentWorkspace = getWorkspaceForPath(pathname);
    const rawItems = getItemsForWorkspace(activeWorkspace, settingsItems);
    const activeItems = activeWorkspace === "settings" ? rawItems : filterItemsByModules(rawItems, enabledModules);

    const switchWorkspace = (ws: Workspace) => {
        setActiveWorkspace(ws);
        const items = ws === "settings"
            ? getItemsForWorkspace(ws, settingsItems)
            : filterItemsByModules(getItemsForWorkspace(ws, settingsItems), enabledModules);
        if (items.length > 0) router.push(items[0].href);
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Workspace Bar */}
            <div className="w-20 bg-white hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-border">
                <div className="h-16 flex items-center justify-center">
                    <Link href="/dashboard/operations/overview" className="flex items-center justify-center">
                        <Logo size="default" tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                    </Link>
                </div>

                <nav className="flex-1 flex flex-col items-stretch gap-1 py-6">
                    {workspaces.map((ws) => {
                        const isActiveWs = currentWorkspace === ws.id;
                        return (
                            <button
                                key={ws.id}
                                data-no-pill
                                onClick={() => switchWorkspace(ws.id)}
                                title={ws.label}
                                className={cn(
                                    "flex items-center justify-center py-3 border-l-[3px] rounded-none transition-all duration-200",
                                    isActiveWs
                                        ? "bg-gray-100 text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50"
                                )}
                                style={isActiveWs ? { borderColor: tenant?.primary_color || 'var(--color-primary)' } : undefined}
                            >
                                <ws.icon className="w-[22px] h-[22px]" />
                            </button>
                        );
                    })}
                </nav>

            </div>

            {/* Desktop Sidebar */}
            <aside className="w-64 bg-background hidden md:flex flex-col fixed inset-y-0 left-20 z-30 border-r border-border">
                <div className="h-16 px-6 flex items-center border-b border-border">
                    <p className="text-[14px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {currentWorkspace.toUpperCase()}
                    </p>
                </div>
                <nav ref={navRef} className="flex-1 px-3 space-y-0.5 overflow-y-auto pt-6 pb-4">
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

                            <div className="px-3 py-3 border-b border-border">
                                <div className="relative">
                                    <select
                                        value={activeWorkspace}
                                        onChange={(e) => setActiveWorkspace(e.target.value as Workspace)}
                                        className="w-full appearance-none bg-secondary/60 text-sm font-semibold rounded-xl px-3 py-2.5 pr-9 border border-border/50 focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {workspaces.map((ws) => (
                                            <option key={ws.id} value={ws.id}>{ws.label}</option>
                                        ))}
                                    </select>
                                    <ChevronUpDownIcon className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              <PageTitleProvider>
                {/* Desktop global header */}
                <header className="hidden md:flex h-16 border-b border-border bg-background items-center px-6 sticky top-0 z-20 gap-4">
                    <PageTitle />
                    <div className="flex items-center gap-1 ml-auto">
                        {showPlatformAdminLink && (
                            <Link
                                href="/platform-admin"
                                title="Platform Admin"
                                className="p-2 rounded-full text-indigo-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                            >
                                <ShieldCheckIcon className="w-6 h-6" />
                            </Link>
                        )}
                        <button
                            title="Notifications"
                            onClick={() => { setNotifOpen(true); refreshNotifs(); }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors relative"
                        >
                            <BellIcon className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-background" />
                            )}
                        </button>
                        <Link href="/dashboard/crm/emails" title="Emails" className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">
                            <EnvelopeIcon className="w-6 h-6" />
                        </Link>
                        <div ref={avatarMenuRef} className="relative">
                            <button
                                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
                                    <span className="text-xs font-bold text-violet-600">{initials}</span>
                                </div>
                            </button>
                            {avatarMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-border shadow-lg py-1 z-50">
                                    <Link
                                        href="/dashboard/settings/settings"
                                        onClick={() => setAvatarMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                                    >
                                        <UserCircleIcon className="w-4 h-4 text-muted-foreground" />
                                        My Profile
                                    </Link>
                                    <button
                                        onClick={() => { setAvatarMenuOpen(false); setSignOutOpen(true); }}
                                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors w-full"
                                    >
                                        <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-muted-foreground" />
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mobile header */}
                <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-20">
                    <Link href="/dashboard/operations/overview" className="flex items-center gap-2">
                        <Logo tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                    </Link>
                    <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
                        <Bars2Icon className="w-5 h-5" />
                    </button>
                </header>
                <div className="w-full pt-4 lg:pt-6 min-w-0"><ErrorBoundary>{children}</ErrorBoundary></div>
              </PageTitleProvider>
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
