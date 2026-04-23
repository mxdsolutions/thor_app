import {
    IconLayoutGrid as Squares2X2Icon,
    IconBriefcase as BriefcaseIcon,
    IconUsersGroup as UserGroupIcon,
    IconCube as CubeIcon,
    IconCalculator as CalculatorIcon,
    IconCurrencyDollar as CurrencyDollarIcon,
    IconCash as BanknotesIcon,
    IconCalendar as CalendarDaysIcon,
    IconChartBar as ChartBarIcon,
    IconFileText as FileTextIcon,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { ROUTES } from "@/lib/routes";

export type NavItem = {
    href: string;
    label: string;
    icon: Icon;
    moduleId?: string;
    /** When set, active state matches on this prefix instead of `href`. */
    matchPrefix?: string;
    /**
     * Permission resource key from lib/permissions.ts. When set, the item is
     * only shown to users with `read` on that resource. Items without a key
     * are always visible (e.g. Overview / Analytics).
     */
    permissionKey?: string;
};

export const OVERVIEW_ITEM: NavItem = {
    href: ROUTES.OVERVIEW,
    label: "Overview",
    icon: Squares2X2Icon,
};

export const ANALYTICS_ITEM: NavItem = {
    href: ROUTES.ANALYTICS,
    label: "Analytics",
    icon: ChartBarIcon,
};

export const NAV_ITEMS: NavItem[] = [
    { href: ROUTES.OPS_JOBS, label: "Jobs", icon: BriefcaseIcon, moduleId: "operations.jobs", permissionKey: "ops.jobs" },
    { href: ROUTES.OPS_SCHEDULE, label: "Schedule", icon: CalendarDaysIcon, moduleId: "operations.schedule", permissionKey: "ops.schedule" },
    { href: ROUTES.OPS_REPORTS, label: "Reports", icon: FileTextIcon, moduleId: "operations.reports", permissionKey: "ops.reports" },
    { href: ROUTES.FINANCE_QUOTES, label: "Quotes", icon: CalculatorIcon, moduleId: "finance.quotes", permissionKey: "finance.quotes" },
    { href: ROUTES.FINANCE_INVOICES, label: "Invoices", icon: BanknotesIcon, moduleId: "finance.invoices", permissionKey: "finance.invoices" },
    { href: ROUTES.CRM_CLIENTS, label: "Clients", icon: UserGroupIcon, moduleId: "crm.contacts", permissionKey: "crm.clients" },
    { href: ROUTES.OPS_SERVICES, label: "Services", icon: CubeIcon, moduleId: "operations.services", permissionKey: "ops.services" },
    { href: ROUTES.FINANCE_PRICING, label: "Materials", icon: CurrencyDollarIcon, moduleId: "finance.pricing", permissionKey: "finance.pricing" },
    { href: ROUTES.ANALYTICS, label: "Analytics", icon: ChartBarIcon },
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
