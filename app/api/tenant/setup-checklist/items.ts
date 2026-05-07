import { ROUTES } from "@/lib/routes";

export type SetupItemKey =
    | "prefix"
    | "company_info"
    | "logo"
    | "report_cover"
    | "invite_members"
    | "first_job"
    | "xero_sync";

export type SetupItemStatus = "complete" | "skipped" | "pending";

export type SetupItem = {
    key: SetupItemKey;
    label: string;
    description: string;
    href: string;
};

// Ordered most → least important. The first item is the highest-leverage thing
// a brand-new owner can do; later items are polish or optional integrations.
export const SETUP_ITEMS: readonly SetupItem[] = [
    {
        key: "company_info",
        label: "Complete your company info",
        description: "Address and contact details appear on every quote, invoice and report.",
        href: `${ROUTES.SETTINGS_COMPANY}/details`,
    },
    {
        key: "logo",
        label: "Upload your logo",
        description: "Used on letterheads, quotes and reports.",
        href: `${ROUTES.SETTINGS_COMPANY}/branding`,
    },
    {
        key: "prefix",
        label: "Set your invoice prefix",
        description: "Used as the prefix on every quote and invoice number.",
        href: `${ROUTES.SETTINGS_COMPANY}/details`,
    },
    {
        key: "first_job",
        label: "Create your first job",
        description: "Get the work flowing — create a job to track from quote to invoice.",
        href: ROUTES.OPS_JOBS,
    },
    {
        key: "invite_members",
        label: "Invite your team",
        description: "Add the people who'll be using THOR with you.",
        href: ROUTES.SETTINGS_USERS,
    },
    {
        key: "xero_sync",
        label: "Connect Xero",
        description: "Sync contacts, quotes and invoices to your accounting system.",
        href: ROUTES.SETTINGS_COMPANY_INTEGRATIONS,
    },
    {
        key: "report_cover",
        label: "Set your reporting cover",
        description: "The cover image used on generated PDF reports.",
        href: `${ROUTES.SETTINGS_COMPANY}/reports`,
    },
] as const;

export const SETUP_ITEM_KEYS = SETUP_ITEMS.map((i) => i.key);

export function isValidItemKey(key: string): key is SetupItemKey {
    return (SETUP_ITEM_KEYS as string[]).includes(key);
}
