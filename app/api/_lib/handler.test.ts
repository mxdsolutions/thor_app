import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks so the module imports below pick them up.
const { createClientMock, createAdminClientMock, getTenantIdMock } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    createAdminClientMock: vi.fn(),
    getTenantIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: createClientMock,
    createAdminClient: createAdminClientMock,
}));
vi.mock("@/lib/tenant", () => ({
    getTenantId: getTenantIdMock,
}));

import { withAuth, withPlatformAuth } from "./handler";

function makeAuthedSupabase(user: unknown) {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        },
    };
}

function makeUnauthedSupabase() {
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
    };
}

function makeRequest(): NextRequest {
    return new NextRequest("https://x.test/api/anything");
}

describe("withAuth", () => {
    beforeEach(() => {
        createClientMock.mockReset();
        getTenantIdMock.mockReset();
    });

    it("returns 401 when there is no user", async () => {
        createClientMock.mockResolvedValue(makeUnauthedSupabase());
        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const res = await wrapped(makeRequest());

        expect(res.status).toBe(401);
        expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when getTenantId throws 'No tenant context available'", async () => {
        createClientMock.mockResolvedValue(makeAuthedSupabase({ id: "u1" }));
        getTenantIdMock.mockRejectedValue(new Error("No tenant context available"));
        const handler = vi.fn();

        const res = await withAuth(handler)(makeRequest());

        expect(res.status).toBe(403);
        expect(handler).not.toHaveBeenCalled();
    });

    it("returns 500 on any other thrown error", async () => {
        createClientMock.mockResolvedValue(makeAuthedSupabase({ id: "u1" }));
        getTenantIdMock.mockRejectedValue(new Error("kaboom"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const res = await withAuth(vi.fn())(makeRequest());

        expect(res.status).toBe(500);
        consoleSpy.mockRestore();
    });

    it("invokes the handler with { supabase, user, tenantId } on success", async () => {
        const supabase = makeAuthedSupabase({ id: "u1", email: "a@b.c" });
        createClientMock.mockResolvedValue(supabase);
        getTenantIdMock.mockResolvedValue("tenant-1");

        const handler = vi.fn().mockResolvedValue(new Response("ok"));
        await withAuth(handler)(makeRequest());

        expect(handler).toHaveBeenCalledTimes(1);
        const ctx = handler.mock.calls[0][1];
        expect(ctx.tenantId).toBe("tenant-1");
        expect(ctx.user.id).toBe("u1");
        expect(ctx.supabase).toBe(supabase);
    });
});

describe("withPlatformAuth", () => {
    beforeEach(() => {
        createClientMock.mockReset();
        createAdminClientMock.mockReset();
    });

    it("returns 401 when there is no user", async () => {
        createClientMock.mockResolvedValue(makeUnauthedSupabase());
        const handler = vi.fn();

        const res = await withPlatformAuth(handler)(makeRequest());

        expect(res.status).toBe(401);
        expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when user is not a platform admin", async () => {
        createClientMock.mockResolvedValue(
            makeAuthedSupabase({ id: "u1", app_metadata: { is_platform_admin: false } })
        );
        const handler = vi.fn();

        const res = await withPlatformAuth(handler)(makeRequest());

        expect(res.status).toBe(403);
        expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when app_metadata is missing", async () => {
        createClientMock.mockResolvedValue(makeAuthedSupabase({ id: "u1" }));

        const res = await withPlatformAuth(vi.fn())(makeRequest());

        expect(res.status).toBe(403);
    });

    it("invokes the handler with adminClient when user is_platform_admin is true", async () => {
        const supabase = makeAuthedSupabase({ id: "u1", app_metadata: { is_platform_admin: true } });
        const adminClient = { sentinel: "admin" };
        createClientMock.mockResolvedValue(supabase);
        createAdminClientMock.mockResolvedValue(adminClient);

        const handler = vi.fn().mockResolvedValue(new Response("ok"));
        await withPlatformAuth(handler)(makeRequest());

        expect(handler).toHaveBeenCalledTimes(1);
        const ctx = handler.mock.calls[0][1];
        expect(ctx.adminClient).toBe(adminClient);
        expect(ctx.user.id).toBe("u1");
    });
});
