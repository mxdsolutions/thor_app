"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useTenantOptional, usePermissionOptional } from "@/lib/tenant-context";
import {
    LogOut as ArrowRightStartOnRectangleIcon,
    Menu as Bars2Icon,
    X as XMarkIcon,
    Mail as EnvelopeIcon,
    Bell as BellIcon,
    Settings as CogIcon,
    Plus as PlusIcon,
    Briefcase,
    Calculator,
    Banknote,
    User,
    FileText,
    CalendarDays,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

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
import { ThorMark } from "@/features/shell/ThorMark";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteGuard } from "@/app/dashboard/RouteGuard";
import { PageTitleProvider, useCurrentPageTitle } from "@/lib/page-title-context";
import { MobileHeaderActionProvider, useMobileHeaderActionValue } from "@/lib/mobile-header-action-context";

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    side="right"
                    sideOffset={10}
                    className="z-50 bg-foreground text-white text-[15px] font-medium px-3 py-1.5 rounded-md border border-white/10 shadow-lg data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:slide-out-to-left-1 data-[state=delayed-open]:slide-in-from-left-1"
                >
                    {label}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}

function PageTitle({ className }: { className?: string }) {
    const title = useCurrentPageTitle();
    if (!title) return null;
    return (
        <h1 className={cn("font-semibold tracking-tight leading-none truncate", className)}>
            {title}
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

function SidebarNav({ items, pathname, onNavigate, compact = false }: { items: NavItem[]; pathname: string; onNavigate?: () => void; compact?: boolean }) {
    const linkClass = (isActive: boolean) => cn(
        "group flex items-center rounded-lg transition-colors duration-150",
        compact
            ? "justify-center w-10 h-10 mx-auto"
            : "gap-3 px-3 py-2.5 text-[15px] font-medium",
        isActive ? "bg-white/10 text-white" : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
    );

    const allItems = [OVERVIEW_ITEM, ...items];

    return (
        <div className={compact ? "space-y-1" : "space-y-0.5"}>
            {allItems.map((item) => {
                const matchTarget = item.matchPrefix ?? item.href;
                const isActive = pathname === matchTarget || pathname.startsWith(matchTarget + "/") || pathname === item.href;
                const link = (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={linkClass(isActive)}
                    >
                        <item.icon className="w-[20px] h-[20px] shrink-0" strokeWidth={2} />
                        {!compact && item.label}
                    </Link>
                );
                return compact ? (
                    <NavTooltip key={item.href} label={item.label}>{link}</NavTooltip>
                ) : link;
            })}
        </div>
    );
}

const CREATE_ITEMS: Array<{ label: string; href: string; icon: typeof Briefcase }> = [
    { label: "Job", href: "/dashboard/jobs?create=1", icon: Briefcase },
    { label: "Quote", href: "/dashboard/quotes?create=1", icon: Calculator },
    { label: "Invoice", href: "/dashboard/invoices?create=1", icon: Banknote },
    { label: "Contact", href: "/dashboard/clients?create=1", icon: User },
    { label: "Report", href: "/dashboard/reports?create=1", icon: FileText },
    { label: "Appointment", href: "/dashboard/schedule?create=1", icon: CalendarDays },
];

function CreateMenu({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    title={compact ? "Create" : undefined}
                    className={cn(
                        "flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm",
                        compact
                            ? "w-10 h-10 mx-auto rounded-full"
                            : "w-full gap-2 px-3 py-2.5 text-[14px] font-semibold rounded-lg"
                    )}
                >
                    <PlusIcon className="w-[16px] h-[16px]" strokeWidth={2.5} />
                    {!compact && "Create"}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align={compact ? "start" : "start"}
                side={compact ? "right" : "bottom"}
                sideOffset={compact ? 8 : 6}
                className={cn("p-1.5", compact && "w-44")}
            >
                {CREATE_ITEMS.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => {
                            setOpen(false);
                            onNavigate?.();
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[14px] font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                        <item.icon className="w-[16px] h-[16px] text-muted-foreground" strokeWidth={2} />
                        {item.label}
                    </Link>
                ))}
            </PopoverContent>
        </Popover>
    );
}

// Self-contained: owns its open state and the notifications hook. Toggling
// the bell or revalidating notifications no longer re-renders the shell.
function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAllRead, markOneRead, refresh } = useNotifications();

    return (
        <>
            <button
                title="Notifications"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
                onClick={() => { setOpen(true); refresh(); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
            >
                <BellIcon className="w-[20px] h-[20px]" strokeWidth={2} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-background" />
                )}
            </button>
            <NotificationSheet
                open={open}
                onOpenChange={setOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onMarkOneRead={markOneRead}
            />
        </>
    );
}

// Self-contained: owns its open state. The trigger button mounts inline in
// the mobile header; the backdrop and drawer use position: fixed so they
// escape the header's bounds. CSS transitions replace framer-motion.
function MobileMenu({
    navItems,
    pathname,
    displayName,
    initials,
    userEmail,
    onTriggerSignOut,
}: {
    navItems: NavItem[];
    pathname: string;
    displayName: string;
    initials: string;
    userEmail: string;
    onTriggerSignOut: () => void;
}) {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <>
            <div className="w-10">
                <button
                    onClick={() => setOpen(true)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    aria-label="Open menu"
                >
                    <Bars2Icon className="w-5 h-5" strokeWidth={2} />
                </button>
            </div>

            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                )}
                onClick={close}
                aria-hidden={!open}
            />

            {/* Drawer */}
            <aside
                style={{ width: "80%" }}
                className={cn(
                    "fixed inset-y-0 left-0 bg-foreground z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
                aria-hidden={!open}
            >
                <div className="flex flex-col px-5 pt-5 pb-4 gap-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0 leading-tight flex-1">
                            <span style={{ fontSize: 40, lineHeight: 1 }} className="font-paladins tracking-[0.08em] text-white">
                                THOR<span className="font-sans text-[0.55em] font-semibold ml-[0.2em] align-super text-white/70">™</span>
                            </span>
                        </div>
                        <button
                            onClick={close}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                            aria-label="Close menu"
                        >
                            <XMarkIcon className="w-5 h-5" strokeWidth={2} />
                        </button>
                    </div>
                    <div className="mt-4 w-full">
                        <CreateMenu onNavigate={close} />
                    </div>
                </div>

                <nav className="flex-1 px-3 overflow-y-auto pt-0 pb-4">
                    <SidebarNav items={navItems} pathname={pathname} onNavigate={close} />
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-0.5">
                        <Link
                            href="/dashboard/settings/account"
                            onClick={close}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-white tracking-wide">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-white truncate">{displayName}</p>
                                <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
                            </div>
                        </Link>
                        <button
                            onClick={() => { close(); onTriggerSignOut(); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors w-full"
                        >
                            <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                            Sign out
                        </button>
                    </div>
                </nav>
            </aside>
        </>
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
    // signOut has triggers in both the desktop sidebar and the mobile drawer,
    // so keep its state at the shell. Other toggles live in their own components.
    const [signOutOpen, setSignOutOpen] = useState(false);

    const tenant = useTenantOptional();
    const hasSettingsAccess = usePermissionOptional("settings", "read", true);

    const { initials, displayName, email: userEmail } = useUserProfile();

    const { data: modulesData } = useTenantModules();
    const modulesList = modulesData?.modules;
    const modulesLoaded = !!modulesData;
    const permissions = tenant?.permissions;
    const role = tenant?.role;

    const enabledModules = useMemo(() => buildEnabledSet(modulesList ?? []), [modulesList]);

    const navItems = useMemo<NavItem[]>(() => {
        const baseNavItems = buildNavItems({ enabledModules, modulesLoaded });
        const visibleNavItems = baseNavItems.filter((item) => {
            if (!item.permissionKey) return true;
            if (!tenant) return true;
            if (role === "owner") return true;
            return permissions?.[item.permissionKey]?.read === true;
        });
        return hasSettingsAccess
            ? [...visibleNavItems, { href: ROUTES.SETTINGS_USERS, label: "Settings", icon: CogIcon, matchPrefix: "/dashboard/settings" }]
            : visibleNavItems;
    }, [enabledModules, modulesLoaded, tenant, role, permissions, hasSettingsAccess]);

    const tenantLabel = tenant?.company_name || tenant?.name;

    return (
        <PageTitleProvider>
        <MobileHeaderActionProvider>
        <TooltipPrimitive.Provider delayDuration={0} skipDelayDuration={300}>
            <div className="h-dvh overflow-hidden flex bg-foreground">

                {/* Desktop Sidebar — icon rail */}
                <aside className="w-[64px] bg-foreground hidden md:flex flex-col shrink-0 border-r border-white/10">
                    <Link
                        href="/dashboard/overview"
                        className="flex items-center justify-center h-14 shrink-0 p-1"
                        aria-label="THOR home"
                    >
                        <ThorMark size={32} surface="dark" className="pr-[2px]" />
                    </Link>
                    <div className="px-3 pb-3">
                        <CreateMenu compact />
                    </div>
                    <nav className="flex-1 px-3 overflow-y-auto pt-1 pb-3">
                        <SidebarNav items={navItems} pathname={pathname} compact />
                    </nav>
                    <div className="p-3 pb-4 border-t border-white/10 space-y-1">
                        <NavTooltip label={displayName}>
                            <Link
                                href="/dashboard/settings/account"
                                className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
                            >
                                <span className="text-xs font-semibold text-white tracking-wide">{initials}</span>
                            </Link>
                        </NavTooltip>
                        <NavTooltip label="Sign out">
                            <button
                                onClick={() => setSignOutOpen(true)}
                                className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                            >
                                <ArrowRightStartOnRectangleIcon className="w-[20px] h-[20px] shrink-0" strokeWidth={2} />
                            </button>
                        </NavTooltip>
                    </div>
                </aside>

                {/* Right column — header + (main + AI panel) */}
                <div className="flex-1 min-w-0 flex flex-col bg-background">

                    {/* Top header — desktop only, off-white, sits over main + AI */}
                    <header className="hidden md:flex h-14 items-center px-6 lg:px-8 gap-4 shrink-0 bg-background">
                        {tenantLabel && (
                            <span className="text-[16px] text-foreground/80 font-medium truncate">
                                {tenantLabel}
                            </span>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                            {showPlatformAdminLink && (
                                <Link
                                    href="/platform-admin"
                                    className="px-3 py-1.5 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                                >
                                    Go to Admin
                                </Link>
                            )}
                            {tenant?.role === "owner" && <SetupChecklist />}
                            <NotificationsBell />
                            <Link
                                href={ROUTES.CRM_EMAILS}
                                title="Emails"
                                aria-label="Emails"
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                                <EnvelopeIcon className="w-[20px] h-[20px]" strokeWidth={2} />
                            </Link>
                            <AssistantTrigger />
                        </div>
                    </header>

                    {/* Body row — main + AI panel, both below the header */}
                    <div className="flex-1 min-h-0 flex">
                        <main className="flex-1 min-w-0 overflow-hidden bg-background">
                            <div className="h-full overflow-hidden flex flex-col">
                                {/* Mobile header */}
                                {!pathname.startsWith("/dashboard/jobs/") && (
                                    <header className="md:hidden h-16 border-b border-border flex items-center px-4 sticky top-0 z-20 bg-background shrink-0">
                                        <MobileMenu
                                            navItems={navItems}
                                            pathname={pathname}
                                            displayName={displayName}
                                            initials={initials}
                                            userEmail={userEmail}
                                            onTriggerSignOut={() => setSignOutOpen(true)}
                                        />
                                        <div className="flex-1 text-center">
                                            <PageTitle className="font-statement font-extrabold tracking-tight text-lg text-foreground" />
                                        </div>
                                        <MobileHeaderActionButton />
                                    </header>
                                )}

                                <div className="relative w-full pt-4 lg:pt-6 min-w-0 flex-1 min-h-0 overflow-y-auto">
                                    <ErrorBoundary><RouteGuard>{children}</RouteGuard></ErrorBoundary>
                                </div>
                            </div>
                        </main>

                        <AssistantPanel />
                    </div>
                </div>

                <AssistantFab />

                <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
            </div>
        </TooltipPrimitive.Provider>
        </MobileHeaderActionProvider>
        </PageTitleProvider>
    );
}
