"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThorWordmark } from "@/components/ThorWordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

interface MarketingNavProps {
    isAuthed: boolean;
}

const NAV_ITEMS = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

export function MarketingNav({ isAuthed }: MarketingNavProps) {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-40 transition-colors duration-300",
                scrolled
                    ? "bg-black/85 backdrop-blur-xl border-b border-white/10"
                    : "bg-transparent",
            )}
        >
            <div className="mx-auto max-w-7xl px-6 lg:px-10 h-[68px] flex items-center justify-between">
                <Link href="/" aria-label="THOR home" className="flex items-center">
                    <ThorWordmark size={26} surface="dark" />
                </Link>

                <nav className="hidden md:flex items-center gap-9 text-[13px] font-medium tracking-wide">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "transition-colors",
                                    active ? "text-white" : "text-white/55 hover:text-white",
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    {isAuthed ? (
                        <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90 hidden sm:inline-flex">
                            <Link href="/dashboard">Open dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex text-[13px] font-medium text-white/70 hover:text-white px-3 py-2 transition-colors"
                            >
                                Sign in
                            </Link>
                            <Button asChild size="sm" className="bg-white text-foreground hover:bg-white/90">
                                <Link href="/signup">Start trial</Link>
                            </Button>
                        </>
                    )}

                    <button
                        type="button"
                        className="md:hidden p-2 -mr-2 text-white/70 hover:text-white"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-black border-t border-white/10">
                    <div className="px-6 py-4 space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.06]"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="pt-3 mt-3 border-t border-white/10 flex gap-2">
                            {isAuthed ? (
                                <Button asChild size="sm" className="flex-1 bg-white text-foreground hover:bg-white/90">
                                    <Link href="/dashboard">Dashboard</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild size="sm" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white">
                                        <Link href="/login">Sign in</Link>
                                    </Button>
                                    <Button asChild size="sm" className="flex-1 bg-white text-foreground hover:bg-white/90">
                                        <Link href="/signup">Start trial</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
