import { describe, it, expect, vi } from "vitest";
import { parseArchiveScope, applyArchiveFilter } from "./archive";

describe("parseArchiveScope", () => {
    it("returns 'active' when the param is absent", () => {
        expect(parseArchiveScope(new Request("https://x.test/"))).toBe("active");
    });

    it("returns 'active' for unrecognised values", () => {
        expect(parseArchiveScope(new Request("https://x.test/?archive=junk"))).toBe("active");
        expect(parseArchiveScope(new Request("https://x.test/?archive=true"))).toBe("active");
    });

    it("returns 'archived' when explicitly requested", () => {
        expect(parseArchiveScope(new Request("https://x.test/?archive=archived"))).toBe("archived");
    });

    it("returns 'all' when explicitly requested", () => {
        expect(parseArchiveScope(new Request("https://x.test/?archive=all"))).toBe("all");
    });
});

describe("applyArchiveFilter", () => {
    function makeBuilder() {
        const builder = {
            is: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
        };
        return builder;
    }

    it("filters out archived rows for 'active'", () => {
        const b = makeBuilder();
        applyArchiveFilter(b, "active");
        expect(b.is).toHaveBeenCalledWith("archived_at", null);
        expect(b.not).not.toHaveBeenCalled();
    });

    it("keeps only archived rows for 'archived'", () => {
        const b = makeBuilder();
        applyArchiveFilter(b, "archived");
        expect(b.not).toHaveBeenCalledWith("archived_at", "is", null);
        expect(b.is).not.toHaveBeenCalled();
    });

    it("applies no filter for 'all'", () => {
        const b = makeBuilder();
        applyArchiveFilter(b, "all");
        expect(b.is).not.toHaveBeenCalled();
        expect(b.not).not.toHaveBeenCalled();
    });
});
