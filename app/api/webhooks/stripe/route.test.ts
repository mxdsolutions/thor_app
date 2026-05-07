import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// The route only constructs Stripe lazily inside getStripe(), but
// STRIPE_WEBHOOK_SECRET is read in the request handler — set it for the tests
// that exercise verification.
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

// --- Mocks --------------------------------------------------------------

const constructEventMock = vi.fn();
const stripeStub = {
    webhooks: {
        constructEvent: (...args: unknown[]) => constructEventMock(...args),
    },
    subscriptions: {
        retrieve: vi.fn(),
    },
};
vi.mock("@/lib/stripe", () => ({
    getStripe: () => stripeStub,
}));

type StubState = {
    insertResult: { error: null | { code: string; message: string } };
    updateCalls: Array<{ table: string; patch: Record<string, unknown> }>;
    insertCalls: Array<{ table: string; row: Record<string, unknown> }>;
};

const state: StubState = {
    insertResult: { error: null },
    updateCalls: [],
    insertCalls: [],
};

function makeClient() {
    return {
        from(table: string) {
            return {
                insert(row: Record<string, unknown>) {
                    state.insertCalls.push({ table, row });
                    return Promise.resolve(state.insertResult);
                },
                update(patch: Record<string, unknown>) {
                    state.updateCalls.push({ table, patch });
                    return {
                        eq: () => Promise.resolve({ error: null }),
                    };
                },
                select() {
                    return {
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: null, error: null }),
                        }),
                    };
                },
            };
        },
    };
}

vi.mock("@/lib/supabase/server", () => ({
    createAdminClient: () => Promise.resolve(makeClient()),
}));

// --- Import after mocks are registered ----------------------------------

import { POST } from "./route";

function request(body: string, headers: Record<string, string> = {}) {
    // Minimal NextRequest shim — the route only uses headers.get + text().
    return {
        headers: {
            get: (name: string) => headers[name.toLowerCase()] ?? null,
        },
        text: () => Promise.resolve(body),
    } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
    constructEventMock.mockReset();
    state.insertResult = { error: null };
    state.updateCalls = [];
    state.insertCalls = [];
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
    it("returns 400 when the stripe-signature header is missing", async () => {
        const res = await POST(request("{}"));
        expect(res.status).toBe(400);
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("returns 400 when signature verification throws", async () => {
        constructEventMock.mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        const res = await POST(request("{}", { "stripe-signature": "sig_bad" }));
        expect(res.status).toBe(400);
        expect(state.insertCalls).toHaveLength(0);
    });

    it("short-circuits with 200 when the event id has already been processed (PK conflict)", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_duplicate",
            type: "invoice.payment_succeeded",
            data: { object: {} },
        } satisfies Pick<Stripe.Event, "id" | "type"> & { data: { object: unknown } });

        state.insertResult = { error: { code: "23505", message: "duplicate key" } };

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(200);
        // No dispatch should have happened → no UPDATE to mark processed_at.
        expect(state.updateCalls).toHaveLength(0);
    });

    it("logs unhandled event types as processed without dispatching", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_unhandled",
            type: "customer.updated",
            data: { object: {} },
        });

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(200);
        expect(state.insertCalls[0]?.table).toBe("stripe_webhook_events");
        // One UPDATE for processed_at timestamp.
        expect(state.updateCalls).toHaveLength(1);
        expect(state.updateCalls[0]?.table).toBe("stripe_webhook_events");
        expect(state.updateCalls[0]?.patch).toHaveProperty("processed_at");
    });

    it("customer.subscription.deleted flips tenant_subscriptions to canceled", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_sub_deleted",
            type: "customer.subscription.deleted",
            data: { object: { id: "sub_123" } },
        });

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(200);

        const subUpdate = state.updateCalls.find((c) => c.table === "tenant_subscriptions");
        expect(subUpdate, "expected an UPDATE on tenant_subscriptions").toBeTruthy();
        expect(subUpdate?.patch).toMatchObject({ status: "canceled", cancel_at_period_end: false });
    });

    it("invoice.payment_failed flips tenant_subscriptions to past_due", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_invoice_failed",
            type: "invoice.payment_failed",
            data: { object: { customer: "cus_123" } },
        });

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(200);

        const subUpdate = state.updateCalls.find((c) => c.table === "tenant_subscriptions");
        expect(subUpdate, "expected an UPDATE on tenant_subscriptions").toBeTruthy();
        expect(subUpdate?.patch).toMatchObject({ status: "past_due" });
    });

    it("trial_will_end is acknowledged but does not write tenant_subscriptions", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_trial_warning",
            type: "customer.subscription.trial_will_end",
            data: { object: { id: "sub_999" } },
        });

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(200);
        const subUpdate = state.updateCalls.find((c) => c.table === "tenant_subscriptions");
        expect(subUpdate).toBeFalsy();
    });

    it("returns 500 (Stripe will retry) when the event-log INSERT fails for a non-23505 reason", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_db_broken",
            type: "invoice.payment_succeeded",
            data: { object: {} },
        });

        state.insertResult = { error: { code: "08006", message: "connection closed" } };

        const res = await POST(request("{}", { "stripe-signature": "sig_ok" }));
        expect(res.status).toBe(500);
        // No dispatch should have run, so no other tables touched.
        expect(state.updateCalls).toHaveLength(0);
    });
});
