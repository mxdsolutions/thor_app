export type PermissionAction = "read" | "write" | "delete";

export type ResourceDefinition = {
    key: string;
    label: string;
    group: ResourceGroup;
    actions: PermissionAction[];
};

export const RESOURCE_GROUPS = [
    "CRM",
    "Operations",
    "Finance",
    "Dashboard",
    "Settings",
    "Integrations",
] as const;

export type ResourceGroup = (typeof RESOURCE_GROUPS)[number];

export type RoleSlug = "owner" | "admin" | "manager" | "member" | "viewer";

export type RolePermissions = Record<
    string,
    { read?: boolean; write?: boolean; delete?: boolean }
>;

export const RESOURCES: ResourceDefinition[] = [
    // CRM
    { key: "crm.clients", label: "Clients", group: "CRM", actions: ["read", "write", "delete"] },

    // Operations
    { key: "ops.jobs", label: "Jobs", group: "Operations", actions: ["read", "write", "delete"] },
    { key: "ops.schedule", label: "Schedule", group: "Operations", actions: ["read", "write", "delete"] },
    { key: "ops.reports", label: "Reports", group: "Operations", actions: ["read", "write", "delete"] },
    { key: "ops.timesheets", label: "Timesheets", group: "Operations", actions: ["read", "write", "delete"] },
    { key: "ops.files", label: "Files", group: "Operations", actions: ["read", "write", "delete"] },

    // Finance
    { key: "finance.quotes", label: "Quotes", group: "Finance", actions: ["read", "write", "delete"] },
    { key: "finance.invoices", label: "Invoices", group: "Finance", actions: ["read", "write", "delete"] },
    { key: "finance.pricing", label: "Materials", group: "Finance", actions: ["read", "write", "delete"] },

    // Dashboard / financial visibility
    { key: "dashboard.financials", label: "Financial Overview Cards", group: "Dashboard", actions: ["read"] },
    { key: "analytics.dashboard", label: "Analytics", group: "Dashboard", actions: ["read"] },

    // Settings
    { key: "settings.users", label: "Users", group: "Settings", actions: ["read", "write", "delete"] },
    { key: "settings.roles", label: "Roles & Permissions", group: "Settings", actions: ["read", "write"] },
    { key: "settings.company", label: "Company", group: "Settings", actions: ["read", "write"] },
    { key: "settings.subscription", label: "Subscription", group: "Settings", actions: ["read", "write"] },

    // Integrations
    { key: "integrations.xero.connect", label: "Xero — Connect & Disconnect", group: "Integrations", actions: ["write"] },
    { key: "integrations.xero.sync", label: "Xero — Run Sync", group: "Integrations", actions: ["write"] },
    { key: "integrations.outlook.connect", label: "Outlook — Connect & Disconnect", group: "Integrations", actions: ["write"] },
];

export function getResourcesByGroup(): Record<ResourceGroup, ResourceDefinition[]> {
    const out = Object.fromEntries(
        RESOURCE_GROUPS.map((g) => [g, [] as ResourceDefinition[]])
    ) as Record<ResourceGroup, ResourceDefinition[]>;
    for (const resource of RESOURCES) out[resource.group].push(resource);
    return out;
}

/**
 * Maps a dashboard URL pathname to the resource whose `read` permission
 * should gate it. Used by the client-side route guard in the dashboard
 * shell. Longest prefix wins. Routes absent from this map are considered
 * ungated (e.g. Overview, Settings — those have their own handling).
 */
const ROUTE_TO_RESOURCE: Array<{ prefix: string; resource: string }> = [
    { prefix: "/dashboard/jobs", resource: "ops.jobs" },
    { prefix: "/dashboard/schedule", resource: "ops.schedule" },
    { prefix: "/dashboard/reports", resource: "ops.reports" },
    { prefix: "/dashboard/scopes", resource: "ops.jobs" },
    { prefix: "/dashboard/timesheets", resource: "ops.timesheets" },
    { prefix: "/dashboard/files", resource: "ops.files" },
    { prefix: "/dashboard/quotes", resource: "finance.quotes" },
    { prefix: "/dashboard/invoices", resource: "finance.invoices" },
    { prefix: "/dashboard/pricing", resource: "finance.pricing" },
    { prefix: "/dashboard/clients", resource: "crm.clients" },
    { prefix: "/dashboard/companies", resource: "crm.clients" },
    { prefix: "/dashboard/contacts", resource: "crm.clients" },
    { prefix: "/dashboard/emails", resource: "crm.clients" },
    { prefix: "/dashboard/analytics", resource: "analytics.dashboard" },
];

export function resolveRouteResource(pathname: string): string | null {
    const match = ROUTE_TO_RESOURCE
        .filter((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];
    return match?.resource ?? null;
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<RoleSlug, RolePermissions> = {
    owner: {
        "crm.clients": { read: true, write: true, delete: true },
        "ops.jobs": { read: true, write: true, delete: true },
        "ops.schedule": { read: true, write: true, delete: true },
        "ops.reports": { read: true, write: true, delete: true },
        "ops.timesheets": { read: true, write: true, delete: true },
        "ops.files": { read: true, write: true, delete: true },
        "finance.quotes": { read: true, write: true, delete: true },
        "finance.invoices": { read: true, write: true, delete: true },
        "finance.pricing": { read: true, write: true, delete: true },
        "dashboard.financials": { read: true },
        "analytics.dashboard": { read: true },
        "settings.users": { read: true, write: true, delete: true },
        "settings.roles": { read: true, write: true },
        "settings.company": { read: true, write: true },
        "settings.subscription": { read: true, write: true },
        "integrations.xero.connect": { write: true },
        "integrations.xero.sync": { write: true },
        "integrations.outlook.connect": { write: true },
    },
    admin: {
        "crm.clients": { read: true, write: true, delete: true },
        "ops.jobs": { read: true, write: true, delete: true },
        "ops.schedule": { read: true, write: true, delete: true },
        "ops.reports": { read: true, write: true, delete: true },
        "ops.timesheets": { read: true, write: true, delete: true },
        "ops.files": { read: true, write: true, delete: true },
        "finance.quotes": { read: true, write: true, delete: true },
        "finance.invoices": { read: true, write: true, delete: true },
        "finance.pricing": { read: true, write: true, delete: true },
        "dashboard.financials": { read: true },
        "analytics.dashboard": { read: true },
        "settings.users": { read: true, write: true, delete: true },
        "settings.company": { read: true, write: true },
        "settings.subscription": { read: true, write: true },
        "integrations.xero.connect": { write: true },
        "integrations.xero.sync": { write: true },
        "integrations.outlook.connect": { write: true },
    },
    manager: {
        "crm.clients": { read: true, write: true },
        "ops.jobs": { read: true, write: true },
        "ops.schedule": { read: true, write: true },
        "ops.reports": { read: true, write: true },
        "ops.timesheets": { read: true, write: true },
        "ops.files": { read: true, write: true },
        "finance.quotes": { read: true, write: true },
        "finance.invoices": { read: true, write: true },
        "finance.pricing": { read: true },
        "dashboard.financials": { read: true },
        "analytics.dashboard": { read: true },
        "settings.users": { read: true },
        "settings.company": { read: true },
        "integrations.xero.sync": { write: true },
    },
    member: {
        "crm.clients": { read: true, write: true },
        "ops.jobs": { read: true, write: true },
        "ops.schedule": { read: true, write: true },
        "ops.reports": { read: true, write: true },
        "ops.timesheets": { read: true, write: true },
        "ops.files": { read: true, write: true },
        "finance.quotes": { read: true, write: true },
        "finance.invoices": { read: true },
        "finance.pricing": { read: true },
        "settings.company": { read: true },
    },
    viewer: {
        "crm.clients": { read: true },
        "ops.jobs": { read: true },
        "ops.schedule": { read: true },
        "ops.reports": { read: true },
        "ops.timesheets": { read: true },
        "ops.files": { read: true },
        "finance.quotes": { read: true },
        "finance.invoices": { read: true },
        "finance.pricing": { read: true },
    },
};
