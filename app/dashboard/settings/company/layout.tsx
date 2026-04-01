"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
    { href: "/dashboard/settings/company/details", label: "Details" },
    { href: "/dashboard/settings/company/branding", label: "Branding" },
    { href: "/dashboard/settings/company/licenses", label: "Licenses" },
    { href: "/dashboard/settings/company/domain", label: "Custom Domain" },
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="px-6 lg:px-10 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight">Company</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your company branding and domain settings
                </p>
            </div>

            <div className="border-b border-border/50 mb-8">
                <div className="flex gap-6 -mb-px">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "pb-3 text-sm font-medium transition-colors relative",
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

            {children}
        </div>
    );
}
