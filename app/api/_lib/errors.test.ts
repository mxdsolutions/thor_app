import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import {
    serverError,
    unauthorizedError,
    forbiddenError,
    validationError,
    notFoundError,
    missingParamError,
} from "./errors";

const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
afterEach(() => consoleSpy.mockClear());

async function readJson(res: Response) {
    return res.json();
}

describe("error helpers", () => {
    describe("serverError", () => {
        it("returns 500 with a generic body", async () => {
            const res = serverError();
            expect(res.status).toBe(500);
            await expect(readJson(res)).resolves.toEqual({ error: "Internal server error" });
        });

        it("does NOT log when called with no args (audit-fix: callers should pass cause)", () => {
            serverError();
            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it("logs the cause when one is provided", () => {
            const cause = new Error("kaboom");
            serverError(cause);
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            // The log line should include the cause object somewhere.
            expect(consoleSpy.mock.calls[0]).toEqual(expect.arrayContaining([cause]));
        });

        it("includes the context tag when provided", () => {
            serverError("err", "myRoute");
            expect(consoleSpy.mock.calls[0][0]).toContain("myRoute");
        });
    });

    describe("unauthorizedError", () => {
        it("returns 401 with Unauthorized body", async () => {
            const res = unauthorizedError();
            expect(res.status).toBe(401);
            await expect(readJson(res)).resolves.toEqual({ error: "Unauthorized" });
        });
    });

    describe("forbiddenError", () => {
        it("returns 403 with default Forbidden body", async () => {
            const res = forbiddenError();
            expect(res.status).toBe(403);
            await expect(readJson(res)).resolves.toEqual({ error: "Forbidden" });
        });

        it("accepts a custom message", async () => {
            const res = forbiddenError("No tenant context");
            await expect(readJson(res)).resolves.toEqual({ error: "No tenant context" });
        });
    });

    describe("validationError", () => {
        it("returns 400 with flattened field errors", async () => {
            const schema = z.object({ name: z.string().min(1) });
            const parsed = schema.safeParse({ name: "" });
            if (parsed.success) throw new Error("expected parse failure");

            const res = validationError(parsed.error);
            expect(res.status).toBe(400);
            const body = await readJson(res);
            expect(body.error).toBe("Validation failed");
            expect(body.details).toHaveProperty("name");
        });
    });

    describe("notFoundError", () => {
        it("interpolates the entity name", async () => {
            const res = notFoundError("Job");
            expect(res.status).toBe(404);
            await expect(readJson(res)).resolves.toEqual({ error: "Job not found" });
        });
    });

    describe("missingParamError", () => {
        it("interpolates the param name", async () => {
            const res = missingParamError("id");
            expect(res.status).toBe(400);
            await expect(readJson(res)).resolves.toEqual({ error: "id is required" });
        });
    });
});
