"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/page-title-context";

const topTabs = [
    {
        id: "users",
        label: "Users",
        basePath: "/dashboard/settings/users",
        subTabs: [
            { href: "/dashboard/settings/users", label: "All Users", exact: true },
            { href: "/dashboard/settings/users/roles", label: "Roles & Permissions" },
        ],
    },
    {
        id: "company",
        label: "Company",
        basePath: "/dashboard/settings/company",
        subTabs: [
            { href: "/dashboard/settings/company/details", label: "Info" },
            { href: "/dashboard/settings/company/licenses", label: "Licenses" },
            { href: "/dashboard/settings/company/branding", label: "Branding" },
            { href: "/dashboard/settings/company/reports", label: "Reports" },
        ],
    },
    {
        id: "account",
        label: "Account",
        basePath: "/dashboard/settings/company",
        subTabs: [
            { href: "/dashboard/settings/company/subscription", label: "Subscription" },
            { href: "/dashboard/settings/company/domain", label: "Custom Domain" },
            { href: "/dashboard/settings/company/integrations", label: "Integrations" },
        ],
    },
];

function getActiveTopTab(pathname: string) {
    // Check account first (more specific paths under company/)
    const accountTab = topTabs.find((t) => t.id === "account");
    if (accountTab?.subTabs.some((st) => pathname === st.href || pathname.startsWith(st.href + "/"))) {
        return "account";
    }
    // Then check others
    for (const tab of topTabs) {
        if (tab.id === "account") continue;
        if (tab.subTabs.some((st) => {
            if ((st as { exact?: boolean }).exact) return pathname === st.href;
            return pathname === st.href || pathname.startsWith(st.href + "/");
        })) {
            return tab.id;
        }
        if (pathname.startsWith(tab.basePath)) return tab.id;
    }
    return topTabs[0].id;
}

// Pages that handle their own layout (profile/settings)
function isStandalonePage(pathname: string) {
    return pathname === "/dashboard/settings/settings" || pathname === "/dashboard/settings";
}

export default function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    usePageTitle("Settings");

    // Profile page and redirects don't get the tab layout
    if (isStandalonePage(pathname)) {
        return <>{children}</>;
    }

    const activeTopTabId = getActiveTopTab(pathname);
    const activeTopTab = topTabs.find((t) => t.id === activeTopTabId) || topTabs[0];

    return (
        <div className="px-4 md:px-6 lg:px-10">
            <div className="mb-4 md:mb-6 hidden md:block">
                <h1 className="font-statement text-2xl font-extrabold tracking-tight">Settings</h1>
            </div>

            {/* Top-level tabs */}
            <div className="border-b border-border/50 mb-4 md:mb-8">
                <div className="flex gap-4 md:gap-6 -mb-px overflow-x-auto">
                    {topTabs.map((tab) => {
                        const isActive = tab.id === activeTopTabId;
                        const firstSubTab = tab.subTabs[0];
                        return (
                            <Link
                                key={tab.id}
                                href={firstSubTab.href}
                                className={cn(
                                    "pb-3 text-base font-medium transition-colors relative whitespace-nowrap",
                                    isActive
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {isActive && (
                                    <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Sub-tabs: horizontal scroll on mobile, vertical sidebar on desktop */}
            <div className="md:hidden mb-4">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {activeTopTab.subTabs.map((subTab) => {
                        const isActive = (subTab as { exact?: boolean }).exact
                            ? pathname === subTab.href
                            : pathname === subTab.href || pathname.startsWith(subTab.href + "/");
                        return (
                            <Link
                                key={subTab.href}
                                href={subTab.href}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                                    isActive
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                )}
                            >
                                {subTab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Two-column layout on desktop, single column on mobile */}
            <div className="flex gap-8">
                {/* Left sub-tabs — desktop only */}
                <nav className="hidden md:block w-44 shrink-0 space-y-0.5">
                    {activeTopTab.subTabs.map((subTab) => {
                        const isActive = (subTab as { exact?: boolean }).exact
                            ? pathname === subTab.href
                            : pathname === subTab.href || pathname.startsWith(subTab.href + "/");
                        return (
                            <Link
                                key={subTab.href}
                                href={subTab.href}
                                className={cn(
                                    "block px-3 py-2 rounded-lg text-base font-medium transition-colors",
                                    isActive
                                        ? "bg-secondary text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                )}
                            >
                                {subTab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Content */}
                <div className="flex-1 max-w-3xl min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
