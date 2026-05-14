"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import {
    platformAdminNavInactiveClass,
    platformAdminNavHoverSurfaceClass,
} from "@/lib/design-system";
import { LogOut as ArrowRightStartOnRectangleIcon, ArrowLeft as ArrowLeftIcon, Menu as Bars2Icon, X as XMarkIcon, ShieldCheck as ShieldCheckIcon } from "lucide-react";
import { PLATFORM_ADMIN_NAV } from "@/features/shell/platform-admin-nav-config";
import { SignOutDialog } from "@/features/shell/SignOutDialog";
import { useUserProfile } from "@/features/shell/use-user-profile";
import { AnimatePresence, motion } from "framer-motion";

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);
    const { initials, displayName, email: userEmail } = useUserProfile();

    // Full-screen pages bypass shell chrome
    if (pathname.includes("/builder") || pathname.includes("/preview")) return <>{children}</>;

    return (
        <div className="min-h-screen bg-black flex">
            {/* Desktop Sidebar */}
            <aside className="w-60 bg-black hidden md:flex flex-col fixed inset-y-0 left-0 z-40">
                <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
                    <Link href="/platform-admin/dashboard" className="flex items-center">
                        <Logo variant="dark" size="default" />
                    </Link>
                </div>

                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-white/40" />
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                            Platform Admin
                        </p>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                    {PLATFORM_ADMIN_NAV.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive ? "bg-white/10 text-white" : platformAdminNavInactiveClass
                                )}
                            >
                                <item.icon className={cn("w-[18px] h-[18px] transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-white/10 space-y-0.5">
                    <Link
                        href="/dashboard"
                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", platformAdminNavInactiveClass)}
                    >
                        <ArrowLeftIcon className="w-[18px] h-[18px]" />
                        Back to Dashboard
                    </Link>
                    <Link href="/dashboard/settings/settings" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors", platformAdminNavHoverSurfaceClass)}>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{displayName}</p>
                            <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => setSignOutOpen(true)}
                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full", platformAdminNavInactiveClass)}
                    >
                        <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px]" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar */}
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
                            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <ShieldCheckIcon className="w-4 h-4 text-white/40" />
                                    <h2 className="text-sm font-semibold text-white">Platform Admin</h2>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-4">
                                {PLATFORM_ADMIN_NAV.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                                isActive ? "bg-white/10 text-white" : platformAdminNavInactiveClass
                                            )}
                                        >
                                            <item.icon className={cn("w-[18px] h-[18px] transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="p-3 border-t border-white/10 space-y-0.5">
                                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full", platformAdminNavInactiveClass)}>
                                    <ArrowLeftIcon className="w-[18px] h-[18px]" />
                                    Back to Dashboard
                                </Link>
                                <Link href="/dashboard/settings/settings" onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer", platformAdminNavHoverSurfaceClass)}>
                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">{initials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{displayName}</p>
                                        <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
                                    </div>
                                </Link>
                                <button onClick={() => { setMobileMenuOpen(false); setSignOutOpen(true); }} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full", platformAdminNavInactiveClass)}>
                                    <ArrowRightStartOnRectangleIcon className="w-[18px] h-[18px]" />
                                    Sign out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <main className="flex-1 md:ml-60 min-w-0 overflow-hidden">
                <div className="bg-background min-h-screen overflow-hidden">
                    <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-20">
                        <Link href="/platform-admin/dashboard" className="flex items-center gap-2">
                            <Logo />
                        </Link>
                        <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
                            <Bars2Icon className="w-5 h-5" />
                        </button>
                    </header>
                    <div className="w-full pt-6 lg:pt-8 min-w-0">{children}</div>
                </div>
            </main>

            <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
        </div>
    );
}
