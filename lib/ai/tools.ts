import type { SupabaseClient, User } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";

export type ToolContext = {
    supabase: SupabaseClient;
    user: User;
    tenantId: string;
};

export type ToolDefinition = Anthropic.Tool;

export type Tool = {
    definition: ToolDefinition;
    execute: (input: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(input: Record<string, unknown>): number {
    const raw = typeof input.limit === "number" ? input.limit : DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, raw));
}

function getString(input: Record<string, unknown>, key: string): string | undefined {
    const v = input[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const tools: Tool[] = [
    {
        definition: {
            name: "get_current_user",
            description:
                "Get the signed-in user's profile, role in the current workspace, and tenant info. Use when the user asks 'who am I', 'what's my role', or needs context about themselves before another action.",
            input_schema: { type: "object", properties: {} },
        },
        execute: async (_input, { supabase, user, tenantId }) => {
            const [{ data: profile }, { data: membership }, { data: tenant }] = await Promise.all([
                supabase.from("profiles").select("id, full_name, email").eq("id", user.id).maybeSingle(),
                supabase
                    .from("tenant_memberships")
                    .select("role")
                    .eq("user_id", user.id)
                    .eq("tenant_id", tenantId)
                    .maybeSingle(),
                supabase.from("tenants").select("id, name, company_name").eq("id", tenantId).maybeSingle(),
            ]);
            return {
                user_id: user.id,
                full_name: profile?.full_name ?? null,
                email: profile?.email ?? user.email ?? null,
                role: membership?.role ?? null,
                tenant: tenant ?? null,
            };
        },
    },
    {
        definition: {
            name: "list_jobs",
            description:
                "List jobs in the current workspace, newest first. Optional filters by status and free-text search across title/description/reference. Returns a compact summary per job.",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Filter by status (e.g. 'in_progress', 'completed', 'archived')." },
                    search: { type: "string", description: "Free-text search across job title, description, reference id." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const limit = clampLimit(input);
            const status = getString(input, "status");
            const search = getString(input, "search");

            let q = supabase
                .from("jobs")
                .select(
                    "id, reference_id, job_title, status, scheduled_start, scheduled_end, amount, company:companies(id, name), contact:contacts(id, first_name, last_name)",
                    { count: "exact" }
                )
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .range(0, limit - 1);

            if (status) q = q.eq("status", status);
            if (search) q = q.or(`job_title.ilike.%${search}%,description.ilike.%${search}%,reference_id.ilike.%${search}%`);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
    {
        definition: {
            name: "get_job",
            description: "Get full details for a single job by id, including assignees and project.",
            input_schema: {
                type: "object",
                properties: { id: { type: "string", description: "Job UUID." } },
                required: ["id"],
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const id = getString(input, "id");
            if (!id) throw new Error("id is required");
            const { data, error } = await supabase
                .from("jobs")
                .select(
                    "*, project:projects!jobs_project_id_fkey(id, title), company:companies(id, name), contact:contacts(id, first_name, last_name, email, phone), assignees:job_assignees(user:profiles(id, full_name, email))"
                )
                .eq("id", id)
                .eq("tenant_id", tenantId)
                .maybeSingle();
            if (error) throw new Error(error.message);
            if (!data) return { not_found: true };
            return {
                ...data,
                assignees: ((data.assignees || []) as { user: unknown }[]).map((a) => a.user).filter(Boolean),
            };
        },
    },
    {
        definition: {
            name: "list_my_jobs",
            description:
                "List jobs assigned to the signed-in user. Use when the user asks 'my jobs', 'what am I working on', etc.",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Optional status filter." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, user, tenantId }) => {
            const limit = clampLimit(input);
            const status = getString(input, "status");

            const { data: assignments, error: aErr } = await supabase
                .from("job_assignees")
                .select("job_id")
                .eq("user_id", user.id)
                .eq("tenant_id", tenantId);
            if (aErr) throw new Error(aErr.message);

            const ids = (assignments ?? []).map((a) => a.job_id);
            if (ids.length === 0) return { total: 0, items: [] };

            let q = supabase
                .from("jobs")
                .select(
                    "id, reference_id, job_title, status, scheduled_start, scheduled_end, company:companies(id, name)",
                    { count: "exact" }
                )
                .eq("tenant_id", tenantId)
                .in("id", ids)
                .order("scheduled_start", { ascending: true, nullsFirst: false })
                .range(0, limit - 1);

            if (status) q = q.eq("status", status);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
    {
        definition: {
            name: "list_contacts",
            description: "List contacts (people), newest first. Optional free-text search across name and email.",
            input_schema: {
                type: "object",
                properties: {
                    search: { type: "string", description: "Free-text search across first_name, last_name, email." },
                    company_id: { type: "string", description: "Restrict to contacts of a specific company." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const limit = clampLimit(input);
            const search = getString(input, "search");
            const companyId = getString(input, "company_id");

            let q = supabase
                .from("contacts")
                .select("id, first_name, last_name, email, phone, job_title, company:companies(id, name)", { count: "exact" })
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .range(0, limit - 1);

            if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
            if (companyId) q = q.eq("company_id", companyId);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
    {
        definition: {
            name: "get_contact",
            description: "Get full details for a single contact by id.",
            input_schema: {
                type: "object",
                properties: { id: { type: "string", description: "Contact UUID." } },
                required: ["id"],
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const id = getString(input, "id");
            if (!id) throw new Error("id is required");
            const { data, error } = await supabase
                .from("contacts")
                .select("*, company:companies(id, name)")
                .eq("id", id)
                .eq("tenant_id", tenantId)
                .maybeSingle();
            if (error) throw new Error(error.message);
            if (!data) return { not_found: true };
            return data;
        },
    },
    {
        definition: {
            name: "list_companies",
            description: "List companies (organisations), newest first. Optional free-text search across name and email.",
            input_schema: {
                type: "object",
                properties: {
                    search: { type: "string", description: "Free-text search across name, email." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const limit = clampLimit(input);
            const search = getString(input, "search");

            let q = supabase
                .from("companies")
                .select("id, name, email, phone, website, address, postcode", { count: "exact" })
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .range(0, limit - 1);

            if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
    {
        definition: {
            name: "get_company",
            description: "Get full details for a single company by id, including its contacts.",
            input_schema: {
                type: "object",
                properties: { id: { type: "string", description: "Company UUID." } },
                required: ["id"],
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const id = getString(input, "id");
            if (!id) throw new Error("id is required");
            const { data, error } = await supabase
                .from("companies")
                .select("*, contacts(id, first_name, last_name, email, phone, job_title)")
                .eq("id", id)
                .eq("tenant_id", tenantId)
                .maybeSingle();
            if (error) throw new Error(error.message);
            if (!data) return { not_found: true };
            return data;
        },
    },
    {
        definition: {
            name: "list_quotes",
            description: "List quotes, newest first. Optional status filter and search.",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Filter by status (e.g. 'draft', 'sent', 'accepted', 'declined')." },
                    search: { type: "string", description: "Free-text search across title and description." },
                    job_id: { type: "string", description: "Restrict to quotes for a specific job." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const limit = clampLimit(input);
            const status = getString(input, "status");
            const search = getString(input, "search");
            const jobId = getString(input, "job_id");

            let q = supabase
                .from("quotes")
                .select(
                    "id, reference_id, title, status, total_amount, valid_until, company:companies(id, name), job:jobs(id, job_title)",
                    { count: "exact" }
                )
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .range(0, limit - 1);

            if (status) q = q.eq("status", status);
            if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            if (jobId) q = q.eq("job_id", jobId);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
    {
        definition: {
            name: "list_invoices",
            description: "List invoices, newest first. Optional status filter and search.",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Filter by status (e.g. 'draft', 'sent', 'paid', 'overdue')." },
                    search: { type: "string", description: "Free-text search across invoice_number and reference." },
                    job_id: { type: "string", description: "Restrict to invoices for a specific job." },
                    limit: { type: "number", description: `Max items (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).` },
                },
            },
        },
        execute: async (input, { supabase, tenantId }) => {
            const limit = clampLimit(input);
            const status = getString(input, "status");
            const search = getString(input, "search");
            const jobId = getString(input, "job_id");

            let q = supabase
                .from("invoices")
                .select(
                    "id, invoice_number, reference, status, total, due_date, issued_at, company:companies(id, name), job:jobs(id, job_title)",
                    { count: "exact" }
                )
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .range(0, limit - 1);

            if (status) q = q.eq("status", status);
            if (search) q = q.or(`invoice_number.ilike.%${search}%,reference.ilike.%${search}%`);
            if (jobId) q = q.eq("job_id", jobId);

            const { data, count, error } = await q;
            if (error) throw new Error(error.message);
            return { total: count ?? 0, items: data ?? [] };
        },
    },
];

export function getAllTools(): Tool[] {
    return tools;
}

export function getToolDefinitions(): ToolDefinition[] {
    return tools.map((t) => t.definition);
}

export async function executeToolCall(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext
): Promise<unknown> {
    const tool = tools.find((t) => t.definition.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(input, ctx);
}
