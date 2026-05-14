import {
    Home as HomeIcon,
    Briefcase as BriefcaseIcon,
    Users as UserGroupIcon,
    Calculator as CalculatorIcon,
    DollarSign as CurrencyDollarIcon,
    Banknote as BanknotesIcon,
    CalendarDays as CalendarDaysIcon,
    BarChart3 as ChartBarIcon,
    FileText as FileTextIcon,
    Folder as FolderIcon,
    Clock as ClockIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    moduleId?: string;
    /** When set, active state matches on this prefix instead of `href`. */
    matchPrefix?: string;
    /**
     * Permission resource key from lib/permissions.ts. When set, the item is
     * only shown to users with `read` on that resource. Items without a key
     * are always visible (e.g. Overview).
     */
    permissionKey?: string;
};

export const OVERVIEW_ITEM: NavItem = {
    href: ROUTES.OVERVIEW,
    label: "Overview",
    icon: HomeIcon,
};

export const ANALYTICS_ITEM: NavItem = {
    href: ROUTES.ANALYTICS,
    label: "Analytics",
    icon: ChartBarIcon,
    permissionKey: "analytics.dashboard",
};

export const NAV_ITEMS: NavItem[] = [
    { href: ROUTES.OPS_SCHEDULE, label: "Schedule", icon: CalendarDaysIcon, moduleId: "operations.schedule", permissionKey: "ops.schedule" },
    { href: ROUTES.OPS_JOBS, label: "Jobs", icon: BriefcaseIcon, moduleId: "operations.jobs", permissionKey: "ops.jobs" },
    { href: ROUTES.FINANCE_QUOTES, label: "Quotes", icon: CalculatorIcon, moduleId: "finance.quotes", permissionKey: "finance.quotes" },
    { href: ROUTES.FINANCE_INVOICES, label: "Invoices", icon: BanknotesIcon, moduleId: "finance.invoices", permissionKey: "finance.invoices" },
    { href: ROUTES.OPS_REPORTS, label: "Reports", icon: FileTextIcon, moduleId: "operations.reports", permissionKey: "ops.reports" },
    { href: ROUTES.CRM_CLIENTS, label: "Clients", icon: UserGroupIcon, moduleId: "crm.contacts", permissionKey: "crm.clients" },
    { href: ROUTES.OPS_TIMESHEETS, label: "Timesheets", icon: ClockIcon, moduleId: "operations.timesheets", permissionKey: "ops.timesheets" },
    { href: ROUTES.FINANCE_PRICING, label: "Pricing", icon: CurrencyDollarIcon, moduleId: "finance.pricing", permissionKey: "finance.pricing" },
    { href: ROUTES.ANALYTICS, label: "Analytics", icon: ChartBarIcon, permissionKey: "analytics.dashboard" },
    { href: ROUTES.FILES, label: "Files", icon: FolderIcon, permissionKey: "ops.files" },
];

/** Build flat list of nav items filtered by enabled modules. */
export function buildNavItems(opts: {
    enabledModules: Set<string>;
    modulesLoaded: boolean;
}): NavItem[] {
    if (!opts.modulesLoaded) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => !item.moduleId || opts.enabledModules.has(item.moduleId));
}

/** Filter nav items by enabled modules. Items without a moduleId are always shown. */
export function filterItemsByModules(items: NavItem[], enabledModules: Set<string>): NavItem[] {
    return items.filter((item) => !item.moduleId || enabledModules.has(item.moduleId));
}
