import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Hoist the mock so the import below picks it up.
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);

import { getValidXeroToken } from "./xero";

type Connection = {
    id: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    xero_tenant_id: string;
    status: string;
};

function makeSupabase(initial: Connection) {
    let row = { ...initial };
    let updateCount = 0;
    const supabase = {
        from(_table: string) {
            return {
                select() {
                    return {
                        eq() {
                            return {
                                eq() {
                                    return {
                                        single: () => Promise.resolve({ data: row, error: null }),
                                    };
                                },
                                single: () => Promise.resolve({ data: row, error: null }),
                            };
                        },
                    };
                },
                update(patch: Partial<Connection>) {
                    return {
                        eq(_col: string, _val: string) {
                            return {
                                eq(col: string, val: string) {
                                    // Optimistic-lock predicate: only succeed when refresh_token
                                    // still matches what the caller used.
                                    if (col === "refresh_token" && val === row.refresh_token) {
                                        row = { ...row, ...patch };
                                        updateCount++;
                                        return Promise.resolve({ error: null });
                                    }
                                    return Promise.resolve({ error: null });
                                },
                            };
                        },
                    };
                },
            };
        },
        get state() {
            return { row, updateCount };
        },
    };
    return supabase as unknown as SupabaseClient & { state: { row: Connection; updateCount: number } };
}

const expiredAt = new Date(Date.now() - 60_000).toISOString();
const futureAt = new Date(Date.now() + 60 * 60_000).toISOString();

beforeEach(() => {
    fetchMock.mockReset();
    process.env.XERO_CLIENT_ID = "client";
    process.env.XERO_CLIENT_SECRET = "secret";
});

describe("getValidXeroToken", () => {
    it("returns the existing token when it isn't near expiry", async () => {
        const supabase = makeSupabase({
            id: "c1",
            access_token: "AT-current",
            refresh_token: "RT-current",
            token_expires_at: futureAt,
            xero_tenant_id: "xtid",
            status: "active",
        });

        const result = await getValidXeroToken(supabase, "tenant-1");
        expect(result.accessToken).toBe("AT-current");
        // No refresh = no fetch.
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refreshes when within the 5-minute skew window and persists the new tokens", async () => {
        const supabase = makeSupabase({
            id: "c1",
            access_token: "AT-old",
            refresh_token: "RT-old",
            token_expires_at: expiredAt,
            xero_tenant_id: "xtid",
            status: "active",
        });

        fetchMock.mockResolvedValueOnce(
            new Response(
                JSON.stringify({ access_token: "AT-new", refresh_token: "RT-new", expires_in: 1800 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        );

        const result = await getValidXeroToken(supabase, "tenant-1");
        expect(result.accessToken).toBe("AT-new");
        // Persisted: row updated with new tokens.
        expect(supabase.state.row.access_token).toBe("AT-new");
        expect(supabase.state.row.refresh_token).toBe("RT-new");
        expect(supabase.state.updateCount).toBe(1);
    });

    it("returns the winner's tokens when its own refresh fails (race-loser path)", async () => {
        // Simulate: another process already refreshed (changed refresh_token);
        // our refresh attempt at Xero fails because the old token was burned.
        // The function should re-read and surface the winner's access_token.
        const supabase = makeSupabase({
            id: "c1",
            access_token: "AT-old",
            refresh_token: "RT-old",
            token_expires_at: expiredAt,
            xero_tenant_id: "xtid",
            status: "active",
        });

        // First fetch (initial read inside getValidXeroToken — handled by the
        // makeSupabase select stub, NOT fetch). The "another process refreshed"
        // case: we mutate the row out-of-band before refreshXeroToken returns.
        fetchMock.mockImplementationOnce(async () => {
            // Mutate the row to simulate the winner's update having landed.
            supabase.state.row.access_token = "AT-winner";
            supabase.state.row.refresh_token = "RT-winner";
            return new Response(
                JSON.stringify({ error: "invalid_grant", error_description: "burned" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        });

        const result = await getValidXeroToken(supabase, "tenant-1");
        expect(result.accessToken).toBe("AT-winner");
    });
});
