import { describe, it, expect, vi } from "vitest";
import { tenantListQuery } from "./list-query";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a chainable mock that records every method call on a builder.
 * Each method returns the same chain so callers can keep chaining.
 */
function makeChain() {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const handler: ProxyHandler<object> = {
        get: (_target, prop) => {
            if (prop === "calls") return calls;
            return (...args: unknown[]) => {
                calls.push({ method: String(prop), args });
                return chain;
            };
        },
    };
    const chain: object = new Proxy({}, handler);
    return { chain, calls };
}

function makeSupabaseStub(chain: object) {
    return {
        from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;
}

describe("tenantListQuery", () => {
    it("always applies the tenant_id filter — the whole point of the helper", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "tenant-1",
            request: new Request("https://x.test/"),
        });

        const eqCalls = calls.filter((c) => c.method === "eq");
        expect(eqCalls).toContainEqual({ method: "eq", args: ["tenant_id", "tenant-1"] });
    });

    it("uses '*' as the default select", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/"),
        });

        const sel = calls.find((c) => c.method === "select");
        expect(sel?.args[0]).toBe("*");
    });

    it("passes through a custom select string", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            select: "id, job_title",
            tenantId: "t",
            request: new Request("https://x.test/"),
        });

        const sel = calls.find((c) => c.method === "select");
        expect(sel?.args[0]).toBe("id, job_title");
    });

    it("orders by created_at desc by default", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/"),
        });

        const order = calls.find((c) => c.method === "order");
        expect(order?.args[0]).toBe("created_at");
        const opts = order?.args[1] as { ascending?: boolean };
        expect(opts.ascending).toBe(false);
    });

    it("ranges according to pagination defaults (offset 0, limit 50 → 0..49)", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/"),
        });

        const range = calls.find((c) => c.method === "range");
        expect(range?.args).toEqual([0, 49]);
    });

    it("composes a single .or() clause from search columns", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/?search=acme"),
            searchColumns: ["job_title", "description"],
        });

        const or = calls.find((c) => c.method === "or");
        expect(or?.args[0]).toBe("job_title.ilike.%acme%,description.ilike.%acme%");
    });

    it("does NOT call .or() when search is absent", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/"),
            searchColumns: ["job_title"],
        });

        expect(calls.find((c) => c.method === "or")).toBeUndefined();
    });

    it("filters out archived rows by default when archivable=true", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/"),
            archivable: true,
        });

        const isCalls = calls.filter((c) => c.method === "is");
        expect(isCalls).toContainEqual({ method: "is", args: ["archived_at", null] });
    });

    it("does NOT add the archive filter when archivable is omitted (table has no archived_at)", () => {
        const { chain, calls } = makeChain();
        const supabase = makeSupabaseStub(chain);

        tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/?archive=archived"),
        });

        expect(calls.find((c) => c.method === "is")).toBeUndefined();
        expect(calls.find((c) => c.method === "not")).toBeUndefined();
    });

    it("returns the parsed pagination + archive scope alongside the builder", () => {
        const { chain } = makeChain();
        const supabase = makeSupabaseStub(chain);

        const { pagination, archiveScope } = tenantListQuery(supabase, "jobs", {
            tenantId: "t",
            request: new Request("https://x.test/?limit=10&offset=20"),
            archivable: true,
        });

        expect(pagination).toEqual({ limit: 10, offset: 20, search: null });
        expect(archiveScope).toBe("active");
    });
});
