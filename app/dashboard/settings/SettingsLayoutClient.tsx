"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/page-title-context";

const topTabs = [
    {
        id: "users",
        label: "Users",
        subTabs: [
            { href: "/dashboard/settings/users", label: "All Users", exact: true },
            { href: "/dashboard/settings/users/roles", label: "Roles" },
        ],
    },
    {
        id: "company",
        label: "Company",
        subTabs: [
            { href: "/dashboard/settings/company/details", label: "Info" },
            { href: "/dashboard/settings/company/licenses", label: "Licenses" },
            { href: "/dashboard/settings/company/branding", label: "Branding" },
        ],
    },
    {
        id: "reports",
        label: "Reports",
        subTabs: [
            { href: "/dashboard/settings/reports/templates", label: "Templates" },
            { href: "/dashboard/settings/reports/cover", label: "Default Cover" },
        ],
    },
    {
        id: "integrations",
        label: "Integrations",
        subTabs: [
            { href: "/dashboard/settings/integrations", label: "All", exact: true },
        ],
    },
    {
        id: "account",
        label: "Account",
        subTabs: [
            { href: "/dashboard/settings/account", label: "Profile", exact: true },
            { href: "/dashboard/settings/account/plan", label: "Plan" },
            { href: "/dashboard/settings/account/custom-domain", label: "Custom Domain" },
        ],
    },
];

function isSubTabActive(pathname: string, subTab: { href: string; exact?: boolean }) {
    if (subTab.exact) return pathname === subTab.href;
    return pathname === subTab.href || pathname.startsWith(subTab.href + "/");
}

function getActiveTopTab(pathname: string) {
    for (const tab of topTabs) {
        if (tab.subTabs.some((st) => isSubTabActive(pathname, st))) {
            return tab.id;
        }
    }
    return topTabs[0].id;
}

export default function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    usePageTitle("Settings");

    // /dashboard/settings (the bare index) just redirects to /users, so it
    // shouldn't render the chrome — the redirect happens server-side and
    // we never reach this client component for that path. No standalone
    // exception needed any more (Profile used to be one but is now an
    // Account sub-tab).

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
                        const isActive = isSubTabActive(pathname, subTab);
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
                        const isActive = isSubTabActive(pathname, subTab);
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
