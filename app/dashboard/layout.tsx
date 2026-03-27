"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { AnimatePresence, motion } from "framer-motion";

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
} from "@heroicons/react/24/outline";

type Workspace = "crm" | "operations" | "settings";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("operations");
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        navRef.current?.scrollTo(0, 0);
    }, [activeWorkspace]);

    const workspaces: { id: Workspace; label: string; icon: any }[] = [
        { id: "crm", label: "CRM", icon: UserGroupIcon },
        { id: "operations", label: "Operations", icon: BriefcaseIcon },
        { id: "settings", label: "Settings", icon: CogIcon },
    ];

    const operationsItems = [
        { href: "/dashboard/operations/overview", label: "Overview", icon: Squares2X2Icon },
        { href: "/dashboard/operations/projects", label: "Projects", icon: ClipboardDocumentListIcon },
        { href: "/dashboard/operations/jobs", label: "Jobs", icon: BriefcaseIcon },
        { href: "/dashboard/operations/products", label: "Products", icon: CubeIcon },
        { href: "/dashboard/operations/content", label: "Content", icon: DocumentTextIcon },
        { href: "/dashboard/operations/users", label: "Users", icon: UsersIcon },
    ];

    const crmItems = [
        { href: "/dashboard/crm/overview", label: "Overview", icon: Squares2X2Icon },
        { href: "/dashboard/crm/leads", label: "Leads", icon: FunnelIcon },
        { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: RocketLaunchIcon },
        { href: "/dashboard/crm/companies", label: "Companies", icon: BuildingOffice2Icon },
        { href: "/dashboard/crm/contacts", label: "Contacts", icon: UserGroupIcon },
        { href: "/dashboard/crm/emails", label: "Emails", icon: EnvelopeIcon },
    ];

    const settingsItems = [
        { href: "/dashboard/settings/settings", label: "Settings", icon: CogIcon },
        { href: "/dashboard/settings/users", label: "Users", icon: UsersIcon },
        { href: "/dashboard/settings/integrations", label: "Integrations", icon: LinkIcon },
    ];

    const getActiveItems = () => {
        switch (activeWorkspace) {
            case "crm":
                return crmItems;
            case "settings":
                return settingsItems;
            default:
                return operationsItems;
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
                                onClick={() => setActiveWorkspace(ws.id)}
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
                    <Link href="/dashboard/settings/settings" title="Profile" className="p-3 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-violet-600">DJ</span>
                        </div>
                    </Link>
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

                {/* Bottom section */}
                <div className="p-3 border-t border-border space-y-1">
                    <Link href="/dashboard/settings/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center ring-2 ring-border">
                            <span className="text-xs font-bold text-violet-600">DJ</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Dylan J.</p>
                            <p className="text-[11px] text-muted-foreground truncate">dylan@example.com</p>
                        </div>
                    </Link>
                    <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full">
                        <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px]" />
                        Sign out
                    </button>
                </div>
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
                                                    setActiveWorkspace(ws.id);
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
                                        <span className="text-xs font-bold text-violet-600">DJ</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">Dylan J.</p>
                                        <p className="text-[11px] text-muted-foreground truncate">dylan@example.com</p>
                                    </div>
                                </Link>
                                <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full">
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
        </div>
    );
}
