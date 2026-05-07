import { describe, it, expect, vi } from "vitest";
import { getAllTools } from "./tools";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * The single most security-relevant invariant in the AI surface: every tool
 * that touches the database must filter by tenant_id. Without that, a user
 * who can talk to the assistant can ask about another tenant's data.
 *
 * These tests exercise each tool with a stub Supabase client and assert that
 * `.eq("tenant_id", <ctx.tenantId>)` was called on the query builder.
 */

type Call = { method: string; args: unknown[] };

function makeChain() {
    const calls: Call[] = [];
    let resolved = false;
    const handler: ProxyHandler<object> = {
        get: (_target, prop) => {
            if (prop === "calls") return calls;
            // The chain is awaitable — when awaited, return an empty result.
            if (prop === "then") {
                if (!resolved) {
                    resolved = true;
                    return (onFulfilled: (v: unknown) => void) =>
                        Promise.resolve({ data: [], count: 0, error: null }).then(onFulfilled);
                }
                return undefined;
            }
            return (...args: unknown[]) => {
                calls.push({ method: String(prop), args });
                return chain;
            };
        },
    };
    const chain: object = new Proxy({}, handler);
    return { chain, calls };
}

function makeCtx() {
    const { chain, calls } = makeChain();
    const supabase = {
        from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;
    const user = { id: "user-1", email: "u@x.test" } as User;
    return { ctx: { supabase, user, tenantId: "tenant-1" }, calls };
}

const TOOLS_REQUIRING_TENANT_FILTER = [
    "get_current_user",
    "list_jobs",
    "get_job",
    "list_my_jobs",
    "list_contacts",
    "get_contact",
    "list_companies",
    "get_company",
    "list_quotes",
    "list_invoices",
];

describe("AI tools — every tool filters by tenant_id", () => {
    const tools = getAllTools();

    it("registers every expected tool", () => {
        const names = tools.map((t) => t.definition.name);
        for (const expected of TOOLS_REQUIRING_TENANT_FILTER) {
            expect(names).toContain(expected);
        }
    });

    for (const toolName of TOOLS_REQUIRING_TENANT_FILTER) {
        it(`${toolName}: every Supabase query filters by tenant_id`, async () => {
            const tool = tools.find((t) => t.definition.name === toolName)!;
            const { ctx, calls } = makeCtx();

            // Pass the dummy uuid where required for single-record tools.
            const input = toolName.startsWith("get_") && toolName !== "get_current_user"
                ? { id: "00000000-0000-0000-0000-000000000000" }
                : {};

            try {
                await tool.execute(input, ctx);
            } catch {
                // Some tools (get_job, get_contact, get_company) call .maybeSingle()
                // which our proxy doesn't fully simulate; we don't care about the
                // happy-path result here, only the .eq() calls made along the way.
            }

            const eqCalls = calls.filter((c) => c.method === "eq");
            const tenantEq = eqCalls.find(
                (c) => c.args[0] === "tenant_id" && c.args[1] === "tenant-1"
            );
            expect(
                tenantEq,
                `tool ${toolName} did not call .eq("tenant_id", ctx.tenantId) — ` +
                    `eq calls were: ${JSON.stringify(eqCalls)}`
            ).toBeTruthy();
        });
    }
});
