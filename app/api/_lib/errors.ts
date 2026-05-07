import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Return a standardized 400 response for Zod validation failures.
 */
export function validationError(error: ZodError) {
    return NextResponse.json(
        {
            error: "Validation failed",
            details: error.flatten().fieldErrors,
        },
        { status: 400 }
    );
}

/**
 * Return a standardized 500 response. Pass the underlying error/context
 * so it gets logged server-side — callers were swallowing details.
 */
export function serverError(cause?: unknown, context?: string) {
    if (cause !== undefined) {
        console.error(context ? `[${context}]` : "[serverError]", cause);
    }
    return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
    );
}

/**
 * Return a standardized 401 response.
 */
export function unauthorizedError() {
    return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
    );
}

/**
 * Return a standardized 403 response.
 */
export function forbiddenError(message = "Forbidden") {
    return NextResponse.json(
        { error: message },
        { status: 403 }
    );
}

/**
 * Return a standardized 404 response.
 */
export function notFoundError(entity: string) {
    return NextResponse.json(
        { error: `${entity} not found` },
        { status: 404 }
    );
}

/**
 * Return a standardized 400 response for missing required params.
 */
export function missingParamError(param: string) {
    return NextResponse.json(
        { error: `${param} is required` },
        { status: 400 }
    );
}
