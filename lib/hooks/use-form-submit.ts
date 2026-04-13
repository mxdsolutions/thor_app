"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ZodSchema } from "zod";

interface UseFormSubmitOptions<TInput, TResult> {
    /** API endpoint URL */
    url: string;
    /** HTTP method (default: "POST") */
    method?: "POST" | "PATCH" | "PUT";
    /** Zod schema for client-side validation (optional — skips if omitted) */
    schema?: ZodSchema<TInput>;
    /** Called with the parsed JSON response on success */
    onSuccess?: (result: TResult) => void;
    /** Toast message on success (default: "Saved successfully") */
    successMessage?: string;
}

interface UseFormSubmitReturn {
    /** Whether a submission is in-flight */
    saving: boolean;
    /** Submit the form data — validates, POSTs, toasts, calls onSuccess */
    submit: (data: unknown) => Promise<boolean>;
}

export function useFormSubmit<TInput = unknown, TResult = unknown>({
    url,
    method = "POST",
    schema,
    onSuccess,
    successMessage = "Saved successfully",
}: UseFormSubmitOptions<TInput, TResult>): UseFormSubmitReturn {
    const [saving, setSaving] = useState(false);

    const submit = useCallback(async (data: unknown): Promise<boolean> => {
        // Client-side validation
        if (schema) {
            const result = schema.safeParse(data);
            if (!result.success) {
                const errors = result.error.flatten().fieldErrors as Record<string, string[]>;
                const firstMessages = Object.values(errors)[0];
                toast.error(firstMessages?.[0] || "Validation failed");
                return false;
            }
        }

        setSaving(true);
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || "Something went wrong");
                return false;
            }

            const json = await res.json();
            toast.success(successMessage);
            onSuccess?.(json);
            return true;
        } catch {
            toast.error("Something went wrong");
            return false;
        } finally {
            setSaving(false);
        }
    }, [url, method, schema, onSuccess, successMessage]);

    return { saving, submit };
}
