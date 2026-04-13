"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useTenantOptional, usePermissionOptional } from "@/lib/tenant-context";
import { AnimatePresence, motion } from "framer-motion";
import { IconLogout as ArrowRightStartOnRectangleIcon, IconMenu2 as Bars2Icon, IconX as XMarkIcon, IconMail as EnvelopeIcon, IconBell as BellIcon, IconSettings as CogIcon } from "@tabler/icons-react";

import {
    OVERVIEW_ITEM,
    buildNavItems,
    type NavItem,
} from "@/features/shell/nav-config";
import { useTenantModules } from "@/lib/swr";
import { buildEnabledSet } from "@/lib/module-config";
import { useNotifications } from "@/features/shell/use-notifications";
import { useUserProfile } from "@/features/shell/use-user-profile";
import { NotificationSheet } from "@/features/shell/NotificationSheet";
import { SignOutDialog } from "@/features/shell/SignOutDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTitleProvider, useCurrentPageTitle } from "@/lib/page-title-context";
import { MobileHeaderActionProvider, useMobileHeaderActionValue } from "@/lib/mobile-header-action-context";
import { pageHeadingClass } from "@/lib/design-system";
import { IconPlus as PlusIcon } from "@tabler/icons-react";

function PageTitle({ companyName }: { companyName?: string | null }) {
    const title = useCurrentPageTitle();
    if (!title) return null;
    return (
        <h1 className={cn(pageHeadingClass, "leading-none")}>
            {title}
            {companyName && (
                <span className="text-muted-foreground font-bold"> | {companyName}</span>
            )}
        </h1>
    );
}

function MobileHeaderActionButton() {
    const action = useMobileHeaderActionValue();
    if (!action) return <div className="w-10" />;
    return (
        <div className="w-10">
            <button
                onClick={action}
                className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors"
                aria-label="Create"
            >
                <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

function SidebarNav({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
    const linkClass = (isActive: boolean) => cn(
        "group flex items-center gap-3 xl:gap-4 px-3 py-2 xl:py-3 rounded-lg font-display text-2xl md:text-base xl:text-xl font-bold uppercase transition-all duration-200",
        isActive ? "bg-white/10 text-white" : "text-[#7b819a] hover:text-white hover:bg-white/[0.07]"
    );

    return (
        <div className="space-y-0.5 xl:space-y-1">
            <Link
                href={OVERVIEW_ITEM.href}
                onClick={onNavigate}
                className={linkClass(pathname === OVERVIEW_ITEM.href || pathname.startsWith(OVERVIEW_ITEM.href + "/"))}
            >
                <OVERVIEW_ITEM.icon className={cn("w-5 h-5 xl:w-6 xl:h-6 shrink-0 transition-transform duration-200", !(pathname === OVERVIEW_ITEM.href) && "group-hover:scale-110")} />
                {OVERVIEW_ITEM.label}
            </Link>
            {items.map((item) => {
                const matchTarget = item.matchPrefix ?? item.href;
                const isActive = pathname === matchTarget || pathname.startsWith(matchTarget + "/") || pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={linkClass(isActive)}
                    >
                        <item.icon className={cn("w-5 h-5 xl:w-6 xl:h-6 shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}

export function DashboardShell({ children, showPlatformAdminLink = false }: { children: React.ReactNode; showPlatformAdminLink?: boolean }) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    // Tenant context (optional — null when no TenantProvider wraps this component)
    const tenant = useTenantOptional();

    // Permission check — defaults to true when no tenant provider is available
    // (e.g., during auth flows) so the settings link isn't hidden prematurely.
    const hasSettingsAccess = usePermissionOptional("settings", "read", true);

    const { initials, displayName, email: userEmail } = useUserProfile();
    const { notifications, unreadCount, markAllRead, markOneRead, refresh: refreshNotifs } = useNotifications();

    // Module access
    const { data: modulesData } = useTenantModules();
    const enabledModules = buildEnabledSet(modulesData?.modules ?? []);
    const modulesLoaded = !!modulesData;

    const baseNavItems = buildNavItems({
        enabledModules,
        modulesLoaded,
    });
    const navItems: NavItem[] = hasSettingsAccess
        ? [...baseNavItems, { href: ROUTES.SETTINGS_USERS, label: "Settings", icon: CogIcon, matchPrefix: "/dashboard/settings" }]
        : baseNavItems;

    return (
        <div className="min-h-screen bg-black flex">
            {/* Desktop Sidebar */}
            <aside className="w-[280px] bg-black hidden md:flex flex-col fixed inset-y-0 left-0 z-30">
                <div className="h-16 xl:h-20 px-5 flex items-center">
                    <Link href="/dashboard/overview" className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg overflow-hidden shrink-0 w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center">
                            <Logo size="default" tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight">
                            <span className="font-display text-xl xl:text-2xl font-extrabold uppercase tracking-wide text-white truncate">{tenant?.company_name || tenant?.name || "Workspace"}</span>
                            <span className="text-[12px] xl:text-[13px] font-medium uppercase tracking-wider text-white/40">Powered by THOR</span>
                        </div>
                    </Link>
                </div>
                <nav className="flex-1 px-3 overflow-y-auto pt-3 xl:pt-4 pb-3 xl:pb-4">
                    <SidebarNav items={navItems} pathname={pathname} />
                </nav>
                <div className="p-3 pb-4 xl:pb-5 border-t border-white/10 space-y-0.5">
                    <Link href="/dashboard/settings/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.07] transition-colors cursor-pointer">
                        <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs xl:text-base font-medium text-white truncate">{displayName}</p>
                            <p className="text-[11px] xl:text-[15px] text-white/40 truncate">{userEmail}</p>
                        </div>
                    </Link>
                    <button onClick={() => setSignOutOpen(true)} className="flex items-center gap-3 xl:gap-4 px-3 py-2 xl:py-3 rounded-lg font-display text-base xl:text-xl font-bold uppercase text-[#7b819a] hover:text-white hover:bg-white/[0.07] transition-colors w-full">
                        <ArrowRightStartOnRectangleIcon className="w-5 h-5 xl:w-6 xl:h-6 shrink-0" />
                        Sign out
                    </button>
                </div>
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
                            className="fixed inset-y-0 left-0 w-72 bg-black z-50 md:hidden flex flex-col shadow-2xl"
                        >
                            <div className="h-20 flex items-center justify-between px-5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="rounded-lg overflow-hidden shrink-0 w-12 h-12 flex items-center justify-center">
                                        <Logo size="default" tenantLogoUrl={tenant?.logo_url} tenantLogoDarkUrl={tenant?.logo_dark_url} />
                                    </div>
                                    <div className="flex flex-col min-w-0 leading-tight">
                                        <span className="font-display text-2xl font-extrabold uppercase tracking-wide text-white truncate">{tenant?.company_name || tenant?.name || "Workspace"}</span>
                                        <span className="text-[13px] font-medium uppercase tracking-wider text-white/40">Powered by THOR</span>
                                    </div>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="flex-1 px-3 overflow-y-auto py-4">
                                <SidebarNav items={navItems} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
                            </nav>

                            <div className="p-3 border-t border-white/10 space-y-0.5">
                                <Link href="/dashboard/settings/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.07] transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">{initials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-white truncate">{displayName}</p>
                                        <p className="text-[15px] text-white/40 truncate">{userEmail}</p>
                                    </div>
                                </Link>
                                <button onClick={() => { setMobileMenuOpen(false); setSignOutOpen(true); }} className="flex items-center gap-4 px-3 py-3 rounded-lg font-display text-lg font-bold text-[#7b819a] hover:text-white hover:bg-white/[0.07] transition-colors w-full">
                                    <ArrowRightStartOnRectangleIcon className="w-6 h-6 shrink-0" />
                                    Sign out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <main className="flex-1 min-w-0 overflow-hidden md:ml-[280px]">
              <PageTitleProvider>
              <MobileHeaderActionProvider>
                <div className="bg-background h-dvh overflow-hidden flex flex-col">
                    {/* Desktop header — inside the container */}
                    <header className="hidden md:flex h-20 border-b border-border items-center px-6 lg:px-10 gap-4 shrink-0">
                        <PageTitle companyName={tenant?.company_name || tenant?.name} />
                        <div className="flex items-center gap-2 ml-auto">
                            {showPlatformAdminLink && (
                                <Link
                                    href="/platform-admin"
                                    className="px-3 py-1.5 text-base font-medium bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
                                >
                                    Go to Admin
                                </Link>
                            )}
                            <button
                                title="Notifications"
                                onClick={() => { setNotifOpen(true); refreshNotifs(); }}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
                            >
                                <BellIcon className="w-[26px] h-[26px]" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-background" />
                                )}
                            </button>
                            <Link href={ROUTES.CRM_EMAILS} title="Emails" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                <EnvelopeIcon className="w-[26px] h-[26px]" />
                            </Link>
                        </div>
                    </header>

                    {/* Mobile header */}
                    <header className="md:hidden h-20 border-b border-border flex items-center px-4 sticky top-0 z-20 bg-background shrink-0">
                        <div className="w-10">
                            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
                                <Bars2Icon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 text-center">
                            <PageTitle />
                        </div>
                        <MobileHeaderActionButton />
                    </header>

                    <div className="relative w-full pt-4 lg:pt-6 pb-16 md:pb-0 min-w-0 flex-1 min-h-0 overflow-y-auto">
                        <ErrorBoundary>{children}</ErrorBoundary>
                    </div>
                </div>
              </MobileHeaderActionProvider>
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
