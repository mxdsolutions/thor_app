import { describe, it, expect } from "vitest";
import { generateShareToken, buildShareUrl } from "./share-tokens";

describe("generateShareToken", () => {
    it("returns a 43-character base64url string (256 bits)", () => {
        const t = generateShareToken();
        expect(t).toHaveLength(43);
        expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("returns a different token on each call", () => {
        const a = generateShareToken();
        const b = generateShareToken();
        expect(a).not.toBe(b);
    });
});

describe("buildShareUrl", () => {
    const tenant = (overrides: Partial<Parameters<typeof buildShareUrl>[0]>) => ({
        custom_domain: null,
        domain_verified: null,
        slug: "acme",
        ...overrides,
    });

    it("uses verified custom domain when set", () => {
        const url = buildShareUrl(
            tenant({ custom_domain: "app.acme.com", domain_verified: true }),
            "tok",
            "any.example.com",
        );
        expect(url).toBe("https://app.acme.com/r/tok");
    });

    it("ignores custom domain that isn't verified", () => {
        const url = buildShareUrl(
            tenant({ custom_domain: "app.acme.com", domain_verified: false }),
            "tok",
            "acme.admin.mxdsolutions.com.au",
        );
        expect(url).not.toContain("app.acme.com");
        expect(url).toContain("/r/tok");
    });

    it("falls back to {slug}.{platform_domain} otherwise", () => {
        const url = buildShareUrl(tenant({}), "tok", "platform.com");
        expect(url).toContain("/r/tok");
        expect(url.startsWith("https://acme.")).toBe(true);
    });

    it("uses request host on localhost (dev)", () => {
        const url = buildShareUrl(tenant({}), "tok", "localhost:8005");
        expect(url).toBe("http://localhost:8005/r/tok");
    });
});
