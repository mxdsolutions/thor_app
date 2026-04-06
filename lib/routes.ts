export const ROUTES = {
    // Overview (top-level)
    OVERVIEW: "/dashboard/overview",

    // CRM
    CRM_LEADS: "/dashboard/leads",
    CRM_COMPANIES: "/dashboard/companies",
    CRM_CONTACTS: "/dashboard/contacts",
    CRM_EMAILS: "/dashboard/emails",

    // Operations
    OPS_JOBS: "/dashboard/jobs",
    OPS_SCOPES: "/dashboard/scopes",
    OPS_SERVICES: "/dashboard/services",
    OPS_REPORTS: "/dashboard/reports",
    OPS_SCHEDULE: "/dashboard/schedule",

    // Finance
    FINANCE_QUOTES: "/dashboard/quotes",
    FINANCE_INVOICES: "/dashboard/invoices",
    FINANCE_PRICING: "/dashboard/pricing",

    // Settings
    SETTINGS_USERS: "/dashboard/settings/users",
    SETTINGS_USERS_ROLES: "/dashboard/settings/users/roles",
    SETTINGS_COMPANY: "/dashboard/settings/company",
    SETTINGS_COMPANY_SUBSCRIPTION: "/dashboard/settings/company/subscription",
    SETTINGS_COMPANY_INTEGRATIONS: "/dashboard/settings/company/integrations",
    SETTINGS_PROFILE: "/dashboard/settings/settings",

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
