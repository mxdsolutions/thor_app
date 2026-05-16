export const ROUTES = {
    // Overview (top-level)
    OVERVIEW: "/dashboard/overview",
    ANALYTICS: "/dashboard/analytics",

    // CRM
    CRM_CLIENTS: "/dashboard/clients",
    CRM_COMPANIES: "/dashboard/companies",
    CRM_CONTACTS: "/dashboard/contacts",
    CRM_EMAILS: "/dashboard/emails",

    // Operations
    OPS_JOBS: "/dashboard/jobs",
    OPS_SCOPES: "/dashboard/scopes",
    OPS_REPORTS: "/dashboard/reports",
    OPS_SCHEDULE: "/dashboard/schedule",
    OPS_TIMESHEETS: "/dashboard/timesheets",

    // Files
    FILES: "/dashboard/files",

    // Finance
    FINANCE_QUOTES: "/dashboard/quotes",
    FINANCE_INVOICES: "/dashboard/invoices",
    FINANCE_PRICING: "/dashboard/pricing",

    // Settings — top tabs and their first sub-tabs (used as the "default
    // landing" target when navigating to the top tab). Sub-tab order must
    // stay in sync with SettingsLayoutClient.tsx.
    SETTINGS_USERS: "/dashboard/settings/users",
    SETTINGS_USERS_ROLES: "/dashboard/settings/users/roles",
    SETTINGS_COMPANY: "/dashboard/settings/company",
    SETTINGS_COMPANY_INFO: "/dashboard/settings/company/details",
    SETTINGS_COMPANY_LICENSES: "/dashboard/settings/company/licenses",
    SETTINGS_COMPANY_BRANDING: "/dashboard/settings/company/branding",
    SETTINGS_REPORT_TEMPLATES: "/dashboard/settings/reports/templates",
    SETTINGS_INTEGRATIONS: "/dashboard/settings/integrations",
    SETTINGS_ACCOUNT: "/dashboard/settings/account",
    SETTINGS_ACCOUNT_PLAN: "/dashboard/settings/account/plan",
    SETTINGS_ACCOUNT_CUSTOM_DOMAIN: "/dashboard/settings/account/custom-domain",

    // Builder — lives at the root path (outside /dashboard) so the editor
    // can take over the full viewport with no shell chrome.
    BUILDER: "/builder",

    // Platform Admin
    PLATFORM_ADMIN: "/platform-admin",

    // Auth
    LOGIN: "/",
    SIGNUP: "/signup",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    ONBOARDING: "/onboarding",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
