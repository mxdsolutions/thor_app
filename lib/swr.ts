import useSWR, { type SWRConfiguration } from "swr";

// --- Shared API response shapes ---

export type PricingItem = {
    Matrix_ID: string | null;
    Trade: string | null;
    Category: string | null;
    Item: string | null;
    UOM: string | null;
    Total_Rate: string | null;
    Material_Cost: string | null;
    Labour_Cost: string | null;
    Pricing_Status: string | null;
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error("Failed to fetch");
        throw error;
    }
    return res.json();
};

const defaultConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
};

export function useCompanies(search?: string, offset = 0, limit = 50) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/companies?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useContacts(search?: string, offset = 0, limit = 50) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/contacts?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useJobs(offset = 0, limit = 50) {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/jobs?${params.toString()}`, fetcher, defaultConfig);
}

export function useScopes() {
    return useSWR("/api/scopes", fetcher, defaultConfig);
}

export function useStats() {
    return useSWR("/api/stats", fetcher, {
        ...defaultConfig,
        dedupingInterval: 30000,
    });
}

export function useProfiles() {
    return useSWR("/api/users", fetcher, {
        ...defaultConfig,
        dedupingInterval: 60000,
    });
}

export function usePricing(search?: string, trade?: string, offset = 0, limit = 100) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (trade) params.set("trade", trade);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/pricing?${params.toString()}`, fetcher, defaultConfig);
}

export function useQuotes(search?: string, offset = 0, limit = 50) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/quotes?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useReports() {
    return useSWR("/api/reports", fetcher, defaultConfig);
}

export function useLicenses() {
    return useSWR("/api/licenses", fetcher, defaultConfig);
}

export function useInvoices(offset = 0, limit = 50) {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/invoices?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useServices(offset = 0, limit = 50) {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return useSWR(`/api/services?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useMyTasks() {
    return useSWR("/api/tasks?assigned_to=me", fetcher, {
        ...defaultConfig,
        keepPreviousData: true,
    });
}

export type MyTenant = {
    id: string;
    name: string;
    slug: string;
    company_name: string | null;
    logo_url: string | null;
    role: string;
};

export function useMyTenants() {
    return useSWR<{ tenants: MyTenant[]; active_tenant_id: string | null }>(
        "/api/me/tenants",
        fetcher,
        { ...defaultConfig, dedupingInterval: 60000 },
    );
}

// --- Schedule Hooks ---

export function useScheduleEntries(start: string, end: string) {
    return useSWR(
        `/api/schedule?start=${start}&end=${end}`,
        fetcher,
        defaultConfig,
    );
}

// --- Report Template Hooks ---

export function useReportTemplates() {
    return useSWR("/api/report-templates", fetcher, defaultConfig);
}

export function usePlatformReportTemplates(search?: string, category?: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    return useSWR(`/api/platform-admin/report-templates?${params.toString()}`, fetcher, defaultConfig);
}

export function usePlatformReportTemplate(id: string | null) {
    return useSWR(id ? `/api/platform-admin/report-templates/${id}` : null, fetcher, defaultConfig);
}

// --- Platform Admin Hooks ---

export function usePlatformTenants(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    return useSWR(`/api/platform-admin/tenants?${params.toString()}`, fetcher, defaultConfig);
}

export function usePlatformTenant(id: string | null) {
    return useSWR(id ? `/api/platform-admin/tenants/${id}` : null, fetcher, defaultConfig);
}

export function usePlatformStats() {
    return useSWR("/api/platform-admin/stats", fetcher, {
        ...defaultConfig,
        dedupingInterval: 30000,
    });
}

// --- Subscription Hooks ---

export type TenantSubscription = {
    status: "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused";
    quantity: number;
    stripe_price_id: string | null;
    trial_end: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
};

export type SubscriptionPlanCycle = { price_id: string; amount_cents: number };
export type SubscriptionPlan = {
    id: "iron_ore" | "iron_oak" | "forged";
    name: string;
    monthly: SubscriptionPlanCycle;
    annual: SubscriptionPlanCycle;
};

export type SeatUsageJson = {
    used: number;
    /** Paid seats (null = unlimited / billing-exempt). */
    quantity: number | null;
    /** Seats available for invite (null = unlimited / billing-exempt). */
    available: number | null;
};

export type TenantSubscriptionResponse = {
    subscription: TenantSubscription | null;
    plans: SubscriptionPlan[];
    eligible_for_trial: boolean;
    billing_exempt: boolean;
    usage: SeatUsageJson;
};

export function useTenantSubscription() {
    return useSWR<TenantSubscriptionResponse>(
        "/api/tenant/subscription",
        fetcher,
        defaultConfig,
    );
}

// --- Tenant Config Hooks ---

export function useStatusConfig(entityType: string | null) {
    return useSWR(
        entityType ? `/api/status-config?entity_type=${entityType}` : null,
        fetcher,
        { ...defaultConfig, dedupingInterval: 60000 },
    );
}

export function useTenantModules() {
    return useSWR("/api/modules", fetcher, {
        ...defaultConfig,
        dedupingInterval: 60000,
    });
}

// --- Job-scoped Hooks ---

export function useJobQuotes(jobId: string | null) {
    return useSWR(jobId ? `/api/quotes?job_id=${jobId}` : null, fetcher, defaultConfig);
}

export function useJobInvoices(jobId: string | null) {
    return useSWR(jobId ? `/api/invoices?job_id=${jobId}` : null, fetcher, defaultConfig);
}

export function useJobReports(jobId: string | null) {
    return useSWR(jobId ? `/api/reports?job_id=${jobId}` : null, fetcher, defaultConfig);
}

// Selection hooks for modals (return only when key is truthy)
export function useCompanyOptions(enabled = true) {
    return useSWR(enabled ? "/api/companies" : null, fetcher, defaultConfig);
}

export function useContactOptions(enabled = true) {
    return useSWR(enabled ? "/api/contacts" : null, fetcher, defaultConfig);
}

export function useServiceOptions(enabled = true) {
    return useSWR(enabled ? "/api/services?limit=200" : null, fetcher, defaultConfig);
}

export function useJobOptions(enabled = true) {
    return useSWR(enabled ? "/api/jobs?limit=200" : null, fetcher, defaultConfig);
}

export type SetupChecklistResponse = {
    items: Array<{
        key: string;
        label: string;
        description: string;
        href: string;
        status: "complete" | "skipped" | "pending";
    }>;
    progress: { done: number; total: number; complete: number };
};

export function useSetupChecklist(enabled = true) {
    return useSWR<SetupChecklistResponse>(
        enabled ? "/api/tenant/setup-checklist" : null,
        fetcher,
        defaultConfig
    );
}

export { fetcher };
