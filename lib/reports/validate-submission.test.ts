import { describe, it, expect } from "vitest";
import { validateReportSubmission } from "./validate-submission";
import type { TemplateSchema } from "@/lib/report-templates/types";

const schema: TemplateSchema = {
    version: 1,
    sections: [
        {
            id: "details",
            title: "Details",
            type: "standard",
            fields: [
                { id: "address", label: "Address", type: "text", required: true },
                { id: "amount", label: "Amount", type: "currency" },
                { id: "verdict", label: "Verdict", type: "select", options: [
                    { label: "Pass", value: "pass" },
                    { label: "Fail", value: "fail" },
                ] },
                { id: "completed", label: "Completed", type: "yes_no", required: true },
                { id: "photos", label: "Photos", type: "photo_upload" },
                { id: "when", label: "When", type: "date" },
            ],
        },
        {
            id: "items",
            title: "Items",
            type: "repeater",
            minItems: 1,
            fields: [
                { id: "name", label: "Name", type: "text", required: true },
                { id: "qty", label: "Qty", type: "number" },
            ],
        },
    ],
};

describe("validateReportSubmission", () => {
    it("flags missing required fields", () => {
        const errors = validateReportSubmission(schema, { details: { amount: 12 }, items: [{ name: "x" }] });
        expect(errors.some((e) => e.field === "address")).toBe(true);
        expect(errors.some((e) => e.field === "completed")).toBe(true);
    });

    it("rejects type-mismatched values", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes", amount: "not-a-number" },
            items: [{ name: "x" }],
        });
        expect(errors.find((e) => e.field === "amount")?.message).toMatch(/number/);
    });

    it("rejects unknown select option", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes", verdict: "maybe" },
            items: [{ name: "x" }],
        });
        expect(errors.find((e) => e.field === "verdict")).toBeTruthy();
    });

    it("rejects bad yes_no values", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "sometimes" },
            items: [{ name: "x" }],
        });
        expect(errors.find((e) => e.field === "completed")).toBeTruthy();
    });

    it("rejects malformed photo arrays", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes", photos: [{ url: "x" }] },
            items: [{ name: "x" }],
        });
        expect(errors.find((e) => e.field === "photos")).toBeTruthy();
    });

    it("accepts well-formed photos", () => {
        const errors = validateReportSubmission(schema, {
            details: {
                address: "1 Main",
                completed: "yes",
                photos: [{ url: "https://example.com/a.jpg", filename: "a.jpg" }],
            },
            items: [{ name: "x" }],
        });
        expect(errors).toHaveLength(0);
    });

    it("enforces repeater minItems", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes" },
            items: [],
        });
        expect(errors.find((e) => e.section === "items" && e.message.includes("at least 1"))).toBeTruthy();
    });

    it("validates fields inside each repeater item", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes" },
            items: [{ qty: "abc" }],
        });
        expect(errors.find((e) => e.section === "items" && e.field === "name")).toBeTruthy();
        expect(errors.find((e) => e.section === "items" && e.field === "qty")).toBeTruthy();
    });

    it("returns no errors for a valid submission", () => {
        const errors = validateReportSubmission(schema, {
            details: {
                address: "1 Main",
                completed: "no",
                amount: 100.5,
                verdict: "pass",
                when: "2026-05-07",
            },
            items: [{ name: "Door", qty: 3 }],
        });
        expect(errors).toHaveLength(0);
    });

    it("ignores unknown sections silently", () => {
        const errors = validateReportSubmission(schema, {
            details: { address: "1 Main", completed: "yes" },
            items: [{ name: "x" }],
            __injected: { surprise: true },
        });
        expect(errors).toHaveLength(0);
    });
});
