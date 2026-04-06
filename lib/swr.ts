import useSWR, { type SWRConfiguration } from "swr";

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

export function useCompanies(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return useSWR(`/api/companies${params}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useContacts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return useSWR(`/api/contacts${params}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useLeads() {
    return useSWR("/api/leads", fetcher, defaultConfig);
}

export function useJobs() {
    return useSWR("/api/jobs", fetcher, defaultConfig);
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

export function useQuotes() {
    return useSWR("/api/quotes", fetcher, defaultConfig);
}

export function useReports() {
    return useSWR("/api/reports", fetcher, defaultConfig);
}

export function useLicenses() {
    return useSWR("/api/licenses", fetcher, defaultConfig);
}

export function useInvoices() {
    return useSWR("/api/invoices", fetcher, defaultConfig);
}

export function useServices() {
    return useSWR("/api/services", fetcher, defaultConfig);
}

export function useMyTasks() {
    return useSWR("/api/tasks?assigned_to=me", fetcher, {
        ...defaultConfig,
        keepPreviousData: true,
    });
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

export function useJobScopes(jobId: string | null) {
    return useSWR(jobId ? `/api/scopes?job_id=${jobId}` : null, fetcher, defaultConfig);
}

export function useJobTasks(jobId: string | null) {
    return useSWR(jobId ? `/api/tasks?job_id=${jobId}` : null, fetcher, defaultConfig);
}

// Selection hooks for modals (return only when key is truthy)
export function useCompanyOptions(enabled = true) {
    return useSWR(enabled ? "/api/companies" : null, fetcher, defaultConfig);
}

export function useContactOptions(enabled = true) {
    return useSWR(enabled ? "/api/contacts" : null, fetcher, defaultConfig);
}

export { fetcher };
