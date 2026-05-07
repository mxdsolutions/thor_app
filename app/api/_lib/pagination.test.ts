import { describe, it, expect } from "vitest";
import { parsePagination } from "./pagination";

function req(url: string): Request {
    return new Request(url);
}

describe("parsePagination", () => {
    it("returns defaults when no params are present", () => {
        expect(parsePagination(req("https://x.test/"))).toEqual({
            limit: 50,
            offset: 0,
            search: null,
        });
    });

    it("parses valid limit/offset/search", () => {
        const result = parsePagination(req("https://x.test/?limit=25&offset=100&search=acme"));
        expect(result).toEqual({ limit: 25, offset: 100, search: "acme" });
    });

    it("clamps limit at MAX_LIMIT (200)", () => {
        const result = parsePagination(req("https://x.test/?limit=9999"));
        expect(result.limit).toBe(200);
    });

    it("falls back to default limit when value is non-numeric or zero", () => {
        expect(parsePagination(req("https://x.test/?limit=abc")).limit).toBe(50);
        expect(parsePagination(req("https://x.test/?limit=0")).limit).toBe(50);
    });

    it("clamps negative offsets to 0", () => {
        expect(parsePagination(req("https://x.test/?offset=-5")).offset).toBe(0);
    });

    it("strips PostgREST-significant chars from search to keep .or() filters safe", () => {
        const result = parsePagination(req("https://x.test/?search=hello%2C%20%28world%29%5C"));
        // commas, parens, and backslash are stripped; remaining whitespace collapsed.
        expect(result.search).not.toMatch(/[,()\\]/);
        expect(result.search).toContain("hello");
        expect(result.search).toContain("world");
    });

    it("trims and slices search to 100 chars", () => {
        const long = "a".repeat(150);
        const result = parsePagination(req(`https://x.test/?search=${long}`));
        expect(result.search!.length).toBeLessThanOrEqual(100);
    });

    it("returns null search when only sanitisable junk was supplied", () => {
        const result = parsePagination(req("https://x.test/?search=%2C%2C%5C"));
        expect(result.search).toBeNull();
    });
});
