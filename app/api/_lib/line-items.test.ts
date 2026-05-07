import { describe, it, expect, vi } from "vitest";
import { recalcQuoteTotal, recalcPurchaseOrderTotal } from "./line-items";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeSupabase(rpcResult: { data: unknown; error: unknown }) {
    const rpc = vi.fn().mockResolvedValue(rpcResult);
    return {
        client: { rpc } as unknown as SupabaseClient,
        rpc,
    };
}

describe("recalcQuoteTotal", () => {
    it("calls recalc_quote_total with the right param", async () => {
        const { client, rpc } = makeSupabase({ data: 250, error: null });
        await recalcQuoteTotal(client, "quote-1");
        expect(rpc).toHaveBeenCalledWith("recalc_quote_total", { p_quote_id: "quote-1" });
    });

    it("returns the numeric total", async () => {
        const { client } = makeSupabase({ data: "1234.5", error: null });
        const total = await recalcQuoteTotal(client, "q");
        expect(total).toBe(1234.5);
    });

    it("returns 0 when the rpc returns null/undefined", async () => {
        const { client } = makeSupabase({ data: null, error: null });
        const total = await recalcQuoteTotal(client, "q");
        expect(total).toBe(0);
    });

    it("throws when the rpc returns an error — money math must not silently fail", async () => {
        const err = new Error("rpc failed");
        const { client } = makeSupabase({ data: null, error: err });
        await expect(recalcQuoteTotal(client, "q")).rejects.toBe(err);
    });
});

describe("recalcPurchaseOrderTotal", () => {
    it("calls recalc_purchase_order_total with the right param", async () => {
        const { client, rpc } = makeSupabase({ data: 99, error: null });
        await recalcPurchaseOrderTotal(client, "po-1");
        expect(rpc).toHaveBeenCalledWith("recalc_purchase_order_total", { p_po_id: "po-1" });
    });

    it("returns the numeric total", async () => {
        const { client } = makeSupabase({ data: "42", error: null });
        const total = await recalcPurchaseOrderTotal(client, "po");
        expect(total).toBe(42);
    });

    it("throws on rpc error", async () => {
        const { client } = makeSupabase({ data: null, error: new Error("nope") });
        await expect(recalcPurchaseOrderTotal(client, "po")).rejects.toThrow("nope");
    });
});
