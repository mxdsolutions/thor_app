import {
    Squares2X2Icon,
    UsersIcon,
    BriefcaseIcon,
    DocumentTextIcon,
    FunnelIcon,
    RocketLaunchIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    CogIcon,
    CubeIcon,
    LinkIcon,
    ShieldCheckIcon,
    CreditCardIcon,
    CalculatorIcon,
    CurrencyDollarIcon,
    BanknotesIcon,
} from "@heroicons/react/24/outline";

export type Workspace = "crm" | "operations" | "finance" | "settings";

export type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type WorkspaceConfig = {
    id: Workspace;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const WORKSPACES: WorkspaceConfig[] = [
    { id: "crm", label: "CRM", icon: UserGroupIcon },
    { id: "operations", label: "Operations", icon: BriefcaseIcon },
    { id: "finance", label: "Finance", icon: BanknotesIcon },
    { id: "settings", label: "Settings", icon: CogIcon },
];

export const OPERATIONS_ITEMS: NavItem[] = [
    { href: "/dashboard/operations/overview", label: "Overview", icon: Squares2X2Icon },
    { href: "/dashboard/operations/jobs", label: "Jobs", icon: BriefcaseIcon },
    { href: "/dashboard/operations/projects", label: "Projects", icon: ClipboardDocumentListIcon },
    { href: "/dashboard/operations/services", label: "Services", icon: CubeIcon },
    { href: "/dashboard/operations/reports", label: "Reports", icon: DocumentTextIcon },
];

export const FINANCE_ITEMS: NavItem[] = [
    { href: "/dashboard/finance/quotes", label: "Quotes", icon: CalculatorIcon },
    { href: "/dashboard/finance/invoices", label: "Invoices", icon: BanknotesIcon },
    { href: "/dashboard/finance/pricing", label: "Pricing", icon: CurrencyDollarIcon },
];

export const CRM_ITEMS: NavItem[] = [
    { href: "/dashboard/crm/overview", label: "Overview", icon: Squares2X2Icon },
    { href: "/dashboard/crm/leads", label: "Leads", icon: FunnelIcon },
    { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: RocketLaunchIcon },
    { href: "/dashboard/crm/companies", label: "Companies", icon: BuildingOffice2Icon },
    { href: "/dashboard/crm/contacts", label: "Contacts", icon: UserGroupIcon },
];

export function getSettingsItems(opts: {
    hasBrandingAccess: boolean;
    hasRolesAccess: boolean;
    hasDomainAccess: boolean;
}): NavItem[] {
    return [
        { href: "/dashboard/settings/users", label: "Users", icon: UsersIcon },
        { href: "/dashboard/settings/integrations", label: "Integrations", icon: LinkIcon },
        ...(opts.hasBrandingAccess || opts.hasDomainAccess ? [{ href: "/dashboard/settings/company", label: "Company", icon: BuildingOffice2Icon }] : []),
        ...(opts.hasRolesAccess ? [{ href: "/dashboard/settings/roles", label: "Roles & Permissions", icon: ShieldCheckIcon }] : []),
        ...(opts.hasDomainAccess ? [{ href: "/dashboard/settings/subscription", label: "Subscription", icon: CreditCardIcon }] : []),
    ];
}

export function getItemsForWorkspace(
    ws: Workspace,
    settingsItems: NavItem[]
): NavItem[] {
    switch (ws) {
        case "crm":
            return CRM_ITEMS;
        case "finance":
            return FINANCE_ITEMS;
        case "settings":
            return settingsItems;
        default:
            return OPERATIONS_ITEMS;
    }
}

export function getWorkspaceForPath(pathname: string): Workspace {
    if (pathname.startsWith("/dashboard/crm")) return "crm";
    if (pathname.startsWith("/dashboard/finance")) return "finance";
    if (pathname.startsWith("/dashboard/settings")) return "settings";
    return "operations";
}
