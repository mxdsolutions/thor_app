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

export { fetcher };
