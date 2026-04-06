import {
    Squares2X2Icon,
    UsersIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    FunnelIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    CogIcon,
    CubeIcon,
    CalculatorIcon,
    CurrencyDollarIcon,
    BanknotesIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { ROUTES } from "@/lib/routes";

export type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    moduleId?: string;
};

export type NavSection = {
    id: string;
    label: string;
    items: NavItem[];
};

export const OVERVIEW_ITEM: NavItem = {
    href: ROUTES.OVERVIEW,
    label: "Overview",
    icon: Squares2X2Icon,
};

export const CRM_ITEMS: NavItem[] = [
    { href: ROUTES.CRM_LEADS, label: "Leads", icon: FunnelIcon, moduleId: "crm.leads" },
    { href: ROUTES.CRM_COMPANIES, label: "Companies", icon: BuildingOffice2Icon, moduleId: "crm.companies" },
    { href: ROUTES.CRM_CONTACTS, label: "Contacts", icon: UserGroupIcon, moduleId: "crm.contacts" },
];

export const OPERATIONS_ITEMS: NavItem[] = [
    { href: ROUTES.OPS_JOBS, label: "Jobs", icon: BriefcaseIcon, moduleId: "operations.jobs" },
    { href: ROUTES.OPS_SCHEDULE, label: "Schedule", icon: CalendarDaysIcon, moduleId: "operations.schedule" },
    { href: ROUTES.FINANCE_QUOTES, label: "Quotes", icon: CalculatorIcon, moduleId: "finance.quotes" },
    { href: ROUTES.FINANCE_INVOICES, label: "Invoices", icon: BanknotesIcon, moduleId: "finance.invoices" },
    { href: ROUTES.OPS_SERVICES, label: "Services", icon: CubeIcon, moduleId: "operations.services" },
    { href: ROUTES.FINANCE_PRICING, label: "Materials", icon: CurrencyDollarIcon, moduleId: "finance.pricing" },
];

export function buildNavSections(opts: {
    hasCrmAccess: boolean;
    hasOperationsAccess: boolean;
    enabledModules: Set<string>;
    modulesLoaded: boolean;
}): NavSection[] {
    const sections: NavSection[] = [];

    const shouldShow = (moduleId: string) => !opts.modulesLoaded || opts.enabledModules.has(moduleId);
    const filterByModules = (items: NavItem[]) =>
        items.filter((item) => !item.moduleId || opts.enabledModules.has(item.moduleId));

    if (opts.hasCrmAccess && shouldShow("crm")) {
        const items = filterByModules(CRM_ITEMS);
        if (items.length > 0) sections.push({ id: "crm", label: "CRM", items });
    }

    if (opts.hasOperationsAccess && (shouldShow("operations") || shouldShow("finance"))) {
        const items = filterByModules(OPERATIONS_ITEMS);
        if (items.length > 0) sections.push({ id: "operations", label: "Operations", items });
    }

    return sections;
}

/** Filter nav items by enabled modules. Items without a moduleId are always shown. */
export function filterItemsByModules(items: NavItem[], enabledModules: Set<string>): NavItem[] {
    return items.filter((item) => !item.moduleId || enabledModules.has(item.moduleId));
}
