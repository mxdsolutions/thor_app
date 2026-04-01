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

export function useCompanies() {
    return useSWR("/api/companies", fetcher, defaultConfig);
}

export function useContacts() {
    return useSWR("/api/contacts", fetcher, defaultConfig);
}

export function useLeads() {
    return useSWR("/api/leads", fetcher, defaultConfig);
}

export function useOpportunities() {
    return useSWR("/api/opportunities", fetcher, defaultConfig);
}

export function useJobs() {
    return useSWR("/api/jobs", fetcher, defaultConfig);
}

export function useServices() {
    return useSWR("/api/services", fetcher, defaultConfig);
}

export function useProjects() {
    return useSWR("/api/projects", fetcher, defaultConfig);
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

export function useXeroConnection() {
    return useSWR("/api/integrations/xero", fetcher, {
        ...defaultConfig,
        dedupingInterval: 30000,
    });
}

export function useXeroSyncStatus() {
    return useSWR("/api/integrations/xero/sync/status", fetcher, {
        ...defaultConfig,
        dedupingInterval: 30000,
    });
}

export { fetcher };
