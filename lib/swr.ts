import useSWR, { mutate as globalMutate, preload, type SWRConfiguration } from "swr";

/** Archive scope for any archivable list endpoint. Default is `active`. */
export type ArchiveScope = "active" | "archived" | "all";

/** Append the archive param when it differs from the default so cache keys
 *  for callers that don't pass a scope stay identical to pre-archive behaviour. */
function appendArchive(params: URLSearchParams, scope?: ArchiveScope) {
    if (scope && scope !== "active") params.set("archive", scope);
}

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
    archived_at?: string | null;
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

export function useCompanies(search?: string, offset = 0, limit = 50, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/companies?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useContacts(search?: string, offset = 0, limit = 50, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/contacts?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useJobs(offset = 0, limit = 50, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/jobs?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
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

export type AnalyticsPeriod = "30d" | "90d" | "qtd" | "ytd" | "all";

export type AnalyticsResponse = {
    period: { start: string; end: string; granularity: "week" | "month" };
    kpis: {
        totalRevenue:  { current: number; previous: number };
        cashCollected: { current: number; previous: number };
        outstandingAR: { current: number };
        totalExpenses: { current: number; previous: number };
        activeJobs:    { current: number };
    };
    revenueChart: { start: string; revenue: number; jobs: number }[];
    jobProfitability: {
        id: string;
        jobTitle: string;
        status: string;
        quoted: number;
        revenue: number;
        expenses: number;
        marginAmount: number;
        marginPct: number;
        paidStatus: string;
    }[];
    arAging: { current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number };
    requestedPeriod: AnalyticsPeriod;
};

export function useAnalytics(period: AnalyticsPeriod) {
    return useSWR<AnalyticsResponse>(`/api/analytics?period=${period}`, fetcher, {
        ...defaultConfig,
        dedupingInterval: 30000,
        keepPreviousData: true,
    });
}

export type OverviewMetricBucket = { count: number; totalAmount: number };
export type OverviewMetrics = {
    pendingQuotes: OverviewMetricBucket;
    pendingInvoices: OverviewMetricBucket;
    activeJobs: OverviewMetricBucket;
};

export function useOverviewMetrics(enabled: boolean = true) {
    return useSWR<OverviewMetrics>(enabled ? "/api/overview/metrics" : null, fetcher, {
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

export function usePricing(search?: string, trade?: string, offset = 0, limit = 100, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (trade) params.set("trade", trade);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/pricing?${params.toString()}`, fetcher, defaultConfig);
}

export function useQuotes(search?: string, offset = 0, limit = 50, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/quotes?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useReports(archive?: ArchiveScope) {
    const params = new URLSearchParams();
    appendArchive(params, archive);
    const qs = params.toString();
    return useSWR(`/api/reports${qs ? `?${qs}` : ""}`, fetcher, defaultConfig);
}

export function useLicenses() {
    return useSWR("/api/licenses", fetcher, defaultConfig);
}

export function useInvoices(offset = 0, limit = 50, archive?: ArchiveScope) {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/invoices?${params.toString()}`, fetcher, { ...defaultConfig, keepPreviousData: true });
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

// --- Report Share-Token Hooks ---

export type ReportShareToken = {
    id: string;
    token: string;
    recipient_email: string | null;
    recipient_name: string | null;
    message: string | null;
    expires_at: string;
    first_opened_at: string | null;
    submitted_at: string | null;
    submitted_by_email: string | null;
    submitted_by_name: string | null;
    revoked_at: string | null;
    email_sent_at: string | null;
    created_at: string;
    created_by: string;
};

export function useReportShareTokens(reportId: string | null) {
    return useSWR<{ items: ReportShareToken[] }>(
        reportId ? `/api/reports/${reportId}/share-tokens` : null,
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

export function useJobScheduleEntries(jobId: string | null) {
    return useSWR(jobId ? `/api/schedule?job_id=${jobId}` : null, fetcher, defaultConfig);
}

export function useJobCounts(jobId: string | null) {
    return useSWR(jobId ? `/api/jobs/${jobId}/counts` : null, fetcher, defaultConfig);
}

// --- File Hooks ---

/** List files at the tenant level (no job filter) or scoped to a single job
 *  when `jobId` is provided. Pass `jobId = null` to list tenant-only files
 *  (where `job_id is null`); omit it to list everything in the tenant. */
export function useFiles(opts: {
    jobId?: string | null;
    /** When `null`, scope to tenant-level files only (`job_id is null`). When
     *  a string, scope to that job's files. When `undefined`, list all. */
    scope?: "tenant" | "job" | "all";
    search?: string;
    archive?: ArchiveScope;
    offset?: number;
    limit?: number;
} = {}) {
    const { jobId, scope = "all", search, archive, offset = 0, limit = 50 } = opts;
    const params = new URLSearchParams();
    if (scope === "job" && jobId) params.set("job_id", jobId);
    if (scope === "tenant") params.set("scope", "tenant");
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    // Don't fetch when caller asked for job scope but didn't supply a jobId.
    const key = scope === "job" && !jobId ? null : `/api/files?${params.toString()}`;
    return useSWR(key, fetcher, { ...defaultConfig, keepPreviousData: true });
}

export function useJobFiles(jobId: string | null) {
    return useSWR(jobId ? `/api/files?job_id=${jobId}` : null, fetcher, defaultConfig);
}

// --- Receipt Hooks ---

export function useJobReceipts(jobId: string | null) {
    return useSWR(jobId ? `/api/receipts?job_id=${jobId}` : null, fetcher, defaultConfig);
}

// --- Timesheet Hooks ---

export function useTimesheets(opts: {
    jobId?: string | null;
    userId?: string | "me" | null;
    search?: string;
    archive?: ArchiveScope;
    offset?: number;
    limit?: number;
} = {}) {
    const { jobId, userId, search, archive, offset = 0, limit = 50 } = opts;
    const params = new URLSearchParams();
    if (jobId) params.set("job_id", jobId);
    if (userId) params.set("user_id", userId);
    if (search) params.set("search", search);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    appendArchive(params, archive);
    return useSWR(`/api/timesheets?${params.toString()}`, fetcher, {
        ...defaultConfig,
        keepPreviousData: true,
    });
}

export function useJobTimesheets(jobId: string | null) {
    return useSWR(
        jobId ? `/api/timesheets?job_id=${jobId}` : null,
        fetcher,
        defaultConfig,
    );
}

/** The currently signed-in user's open clock-in timer, or null. Polls every
 *  30s so the elapsed display in the dashboard stays roughly fresh even when
 *  the user has multiple tabs open. */
export function useActiveTimesheet() {
    return useSWR("/api/timesheets/active", fetcher, {
        ...defaultConfig,
        refreshInterval: 30000,
    });
}

/** Revalidate every cached `/api/timesheets*` key — list, job-scoped, and the
 *  active-timer endpoint. Call after any mutation so stale lists don't linger. */
export function refreshTimesheetCache() {
    void globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/timesheets"),
        undefined,
        { revalidate: true },
    );
}

// --- Purchase Order Hooks ---

export function useJobPurchaseOrders(jobId: string | null) {
    return useSWR(jobId ? `/api/purchase-orders?job_id=${jobId}` : null, fetcher, defaultConfig);
}

/** Returns POs that were generated from a specific quote — used to compute
 *  the "X of Y line items have POs" progress on the quote sheet. */
export function useQuotePurchaseOrders(quoteId: string | null) {
    return useSWR(
        quoteId ? `/api/purchase-orders?source_quote_id=${quoteId}` : null,
        fetcher,
        defaultConfig
    );
}

// Selection hooks for modals (return only when key is truthy)
export function useCompanyOptions(enabled = true) {
    return useSWR(enabled ? "/api/companies" : null, fetcher, defaultConfig);
}

export function useContactOptions(enabled = true) {
    return useSWR(enabled ? "/api/contacts" : null, fetcher, defaultConfig);
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

// --- Entity Preview Hooks ---

export type EntityPreviewType = "contact" | "company" | "job" | "invoice" | "quote" | "user";

/** Lazy-fetched preview metadata for an entity. Used by EntityPreviewCard
 *  hover/tap surfaces so we only hit the API when a card actually opens. */
export function useEntityPreview(type: EntityPreviewType | null, id: string | null) {
    const key = type && id ? `/api/entity-preview/${type}/${id}` : null;
    return useSWR(key, fetcher, { ...defaultConfig, dedupingInterval: 30000 });
}

/** Warm the SWR cache for an entity preview ahead of opening the card.
 *  Called on hover-enter (desktop) or pointer-down (mobile) so the request
 *  is in flight before the user actually sees the popover render. Subsequent
 *  hovers within the dedupe window are free. */
export function preloadEntityPreview(type: EntityPreviewType, id: string): void {
    if (!type || !id) return;
    void preload(`/api/entity-preview/${type}/${id}`, fetcher);
}

export { fetcher };
