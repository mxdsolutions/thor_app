import {
    IconLayoutGrid as Squares2X2Icon,
    IconBriefcase as BriefcaseIcon,
    IconBuildingSkyscraper as BuildingOffice2Icon,
    IconUsersGroup as UserGroupIcon,
    IconCube as CubeIcon,
    IconCalculator as CalculatorIcon,
    IconCurrencyDollar as CurrencyDollarIcon,
    IconCash as BanknotesIcon,
    IconCalendar as CalendarDaysIcon,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { ROUTES } from "@/lib/routes";

export type NavItem = {
    href: string;
    label: string;
    icon: Icon;
    moduleId?: string;
};

export const OVERVIEW_ITEM: NavItem = {
    href: ROUTES.OVERVIEW,
    label: "Overview",
    icon: Squares2X2Icon,
};

export const NAV_ITEMS: NavItem[] = [
    { href: ROUTES.OPS_JOBS, label: "Jobs", icon: BriefcaseIcon, moduleId: "operations.jobs" },
    { href: ROUTES.OPS_SCHEDULE, label: "Schedule", icon: CalendarDaysIcon, moduleId: "operations.schedule" },
    { href: ROUTES.FINANCE_QUOTES, label: "Quotes", icon: CalculatorIcon, moduleId: "finance.quotes" },
    { href: ROUTES.FINANCE_INVOICES, label: "Invoices", icon: BanknotesIcon, moduleId: "finance.invoices" },
    { href: ROUTES.CRM_CONTACTS, label: "Contacts", icon: UserGroupIcon, moduleId: "crm.contacts" },
    { href: ROUTES.CRM_COMPANIES, label: "Companies", icon: BuildingOffice2Icon, moduleId: "crm.companies" },
    { href: ROUTES.OPS_SERVICES, label: "Services", icon: CubeIcon, moduleId: "operations.services" },
    { href: ROUTES.FINANCE_PRICING, label: "Materials", icon: CurrencyDollarIcon, moduleId: "finance.pricing" },
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
