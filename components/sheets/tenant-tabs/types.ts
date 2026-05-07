export type TenantMember = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { full_name: string; email: string; avatar_url: string | null } | null;
};

export type Tenant = {
    id: string;
    name: string;
    company_name: string | null;
    slug: string;
    status: string;
    member_count: number;
    owner: { full_name: string; email: string } | null;
    owner_id: string | null;
    logo_url: string | null;
    logo_dark_url: string | null;
    primary_color: string | null;
    custom_domain: string | null;
    domain_verified: boolean;
    address: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
    created_at: string;
    members?: TenantMember[];
    notes: string | null;
};

export type TenantSaveHandler = (column: string, value: string | number | null) => Promise<void>;

export type ModuleNode = {
    workspace: string;
    id: string;
    children: { id: string; label: string }[];
};

export const MODULE_TREE: ModuleNode[] = [
    {
        workspace: "CRM",
        id: "crm",
        children: [
            { id: "crm.companies", label: "Companies" },
            { id: "crm.contacts", label: "Contacts" },
        ],
    },
    {
        workspace: "Operations",
        id: "operations",
        children: [
            { id: "operations.jobs", label: "Jobs" },
            { id: "operations.projects", label: "Scopes" },
            { id: "operations.reports", label: "Reports" },
        ],
    },
    {
        workspace: "Finance",
        id: "finance",
        children: [
            { id: "finance.quotes", label: "Quotes" },
            { id: "finance.invoices", label: "Invoices" },
            { id: "finance.pricing", label: "Pricing" },
        ],
    },
];

export const PRESET_COLORS = [
    "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-rose-400",
    "bg-violet-500", "bg-indigo-500", "bg-red-500", "bg-green-500",
    "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500",
    "bg-teal-500", "bg-orange-500",
];
