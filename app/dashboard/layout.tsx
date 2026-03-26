"use client";

import { useState } from "react";
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
} from "@heroicons/react/24/outline";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: "/dashboard", label: "Overview", icon: Squares2X2Icon },
        { href: "/dashboard/jobs", label: "Jobs", icon: BriefcaseIcon },
        { href: "/dashboard/projects", label: "Projects", icon: ClipboardDocumentListIcon },
        { href: "/dashboard/content", label: "Content", icon: DocumentTextIcon },
        { href: "/dashboard/users", label: "Users", icon: UsersIcon },
    ];

    const crmNavItems = [
        { href: "/dashboard/leads", label: "Leads", icon: FunnelIcon },
        { href: "/dashboard/opportunities", label: "Opportunities", icon: RocketLaunchIcon },
        { href: "/dashboard/companies", label: "Companies", icon: BuildingOffice2Icon },
        { href: "/dashboard/contacts", label: "Contacts", icon: UserGroupIcon },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-background hidden md:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border">
                {/* Logo */}
                <div className="h-16 flex items-center px-6">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <Logo />
                    </Link>
                </div>

                {/* Section label */}
                <div className="px-6 pt-4 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Menu</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
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

                    {/* CRM Section */}
                    <div className="pt-4 pb-2 px-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">CRM</p>
                    </div>
                    {crmNavItems.map((item) => {
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
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
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
                            <div className="h-14 flex items-center justify-between px-5">
                                <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                                    <Logo />
                                </Link>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Section label */}
                            <div className="px-5 pt-4 pb-2">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Menu</p>
                            </div>

                            {/* Nav */}
                            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                                {navItems.map((item) => {
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

                                {/* CRM Section */}
                                <div className="pt-4 pb-2 px-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">CRM</p>
                                </div>
                                {crmNavItems.map((item) => {
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
                                <Link href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center ring-2 ring-border">
                                        <span className="text-xs font-bold text-violet-600">DJ</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">Dylan J.</p>
                                        <p className="text-[11px] text-muted-foreground truncate">dylan@example.com</p>
                                    </div>
                                </Link>
                                <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full">
                                    <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px]" />
                                    Sign out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <main className="flex-1 md:ml-64">
                {/* Mobile header with hamburger */}
                <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-20">
                    <Link href="/dashboard" className="flex items-center gap-2">
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
