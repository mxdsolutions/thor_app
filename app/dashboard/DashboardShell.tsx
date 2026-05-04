"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantSwitcher } from "@/components/TenantSwitcher";
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
import { SetupChecklist } from "@/features/shell/SetupChecklist";
import { SignOutDialog } from "@/features/shell/SignOutDialog";
import { AssistantProvider } from "@/features/assistant/AssistantContext";
import { AssistantPanel } from "@/features/assistant/AssistantPanel";
import { AssistantTrigger } from "@/features/assistant/AssistantTrigger";
import { AssistantFab } from "@/features/assistant/AssistantFab";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteGuard } from "@/app/dashboard/RouteGuard";
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
        isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/[0.07]"
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

export function DashboardShell(props: { children: React.ReactNode; showPlatformAdminLink?: boolean }) {
    return (
        <AssistantProvider>
            <DashboardShellInner {...props} />
        </AssistantProvider>
    );
}

function DashboardShellInner({ children, showPlatformAdminLink = false }: { children: React.ReactNode; showPlatformAdminLink?: boolean }) {
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
    const permissions = tenant?.permissions;
    const role = tenant?.role;
    const visibleNavItems = baseNavItems.filter((item) => {
        if (!item.permissionKey) return true;
        if (!tenant) return true; // fail-open while tenant context loads
        if (role === "owner") return true;
        return permissions?.[item.permissionKey]?.read === true;
    });
    const navItems: NavItem[] = hasSettingsAccess
        ? [...visibleNavItems, { href: ROUTES.SETTINGS_USERS, label: "Settings", icon: CogIcon, matchPrefix: "/dashboard/settings" }]
        : visibleNavItems;

    return (
        <div className="h-dvh overflow-hidden bg-black flex">
            {/* Desktop Sidebar */}
            <aside className="w-[280px] bg-black hidden md:flex flex-col fixed inset-y-0 left-0 z-30">
                <div className="px-5 pt-5 pb-4 flex flex-col min-w-0">
                    <Link href="/dashboard/overview" className="flex flex-col min-w-0 leading-tight">
                        <span className="font-paladins text-[34px] xl:text-[40px] tracking-[0.08em] text-white leading-none">THOR<span className="font-sans text-[0.55em] font-semibold ml-[0.2em] align-super text-white/70">™</span></span>
                        <span className="text-[12px] xl:text-[13px] font-semibold uppercase tracking-[0.18em] text-white/50 mt-1 leading-none">Construction. Amplified.</span>
                    </Link>
                    {tenant && (
                        <div className="mt-4 w-full min-w-0">
                            <TenantSwitcher active={{ id: tenant.id, name: tenant.name, company_name: tenant.company_name, logo_url: tenant.logo_url }} />
                        </div>
                    )}
                </div>
                <nav className="flex-1 px-3 overflow-y-auto pt-0 pb-3 xl:pb-4">
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
                    <button onClick={() => setSignOutOpen(true)} className="flex items-center gap-3 xl:gap-4 px-3 py-2 xl:py-3 rounded-lg font-display text-base xl:text-xl font-bold uppercase text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors w-full">
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
                            style={{ width: "90%" }}
                            className="fixed inset-y-0 left-0 bg-black z-50 md:hidden flex flex-col shadow-2xl"
                        >
                            <div className="flex flex-col px-5 pt-5 pb-4 gap-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col min-w-0 leading-tight flex-1">
                                        <span style={{ fontSize: 40, lineHeight: 1 }} className="font-paladins tracking-[0.08em] text-white">THOR<span className="font-sans text-[0.55em] font-semibold ml-[0.2em] align-super text-white/70">™</span></span>
                                        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/50 mt-1 leading-none">Construction. Amplified.</span>
                                    </div>
                                    <button onClick={() => setMobileMenuOpen(false)} className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                {tenant && (
                                    <div className="mt-4 w-full min-w-0">
                                        <TenantSwitcher active={{ id: tenant.id, name: tenant.name, company_name: tenant.company_name, logo_url: tenant.logo_url }} />
                                    </div>
                                )}
                            </div>

                            <nav className="flex-1 px-3 overflow-y-auto pt-0 pb-4">
                                <SidebarNav items={navItems} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-0.5">
                                    <Link href="/dashboard/settings/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.07] transition-colors cursor-pointer">
                                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">{initials}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-medium text-white truncate">{displayName}</p>
                                            <p className="text-[15px] text-white/40 truncate">{userEmail}</p>
                                        </div>
                                    </Link>
                                    <button onClick={() => { setMobileMenuOpen(false); setSignOutOpen(true); }} className="flex items-center gap-4 px-3 py-3 rounded-lg font-display text-lg font-bold text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors w-full">
                                        <ArrowRightStartOnRectangleIcon className="w-6 h-6 shrink-0" />
                                        Sign out
                                    </button>
                                </div>
                            </nav>
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
                            {tenant?.role === "owner" && <SetupChecklist />}
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
                            <AssistantTrigger />
                        </div>
                    </header>

                    {/* Mobile header — hidden on job detail pages so the detail view spans full height */}
                    {!pathname.startsWith("/dashboard/jobs/") && (
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
                    )}

                    <div className="relative w-full pt-4 lg:pt-6 min-w-0 flex-1 min-h-0 overflow-y-auto">
                        <ErrorBoundary><RouteGuard>{children}</RouteGuard></ErrorBoundary>
                    </div>
                </div>
              </MobileHeaderActionProvider>
              </PageTitleProvider>
            </main>

            <AssistantPanel />
            <AssistantFab />

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
