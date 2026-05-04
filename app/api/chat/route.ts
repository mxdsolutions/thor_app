import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { serverError, validationError } from "@/app/api/_lib/errors";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import {
    AI_MODEL,
    MAX_OUTPUT_TOKENS,
    MAX_TOOL_TURNS,
    buildSystemPrompt,
    getAnthropicClient,
} from "@/lib/ai/client";
import { executeToolCall, getToolDefinitions } from "@/lib/ai/tools";

const messageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
});

const requestSchema = z.object({
    messages: z.array(messageSchema).min(1).max(40),
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
            { error: "Assistant is not configured" },
            { status: 503 }
        );
    }

    const body = await request.json().catch(() => null);
    const validation = requestSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const [{ data: profile }, { data: membership }, { data: tenant }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase
            .from("tenant_memberships")
            .select("role")
            .eq("user_id", user.id)
            .eq("tenant_id", tenantId)
            .maybeSingle(),
        supabase.from("tenants").select("name, company_name").eq("id", tenantId).maybeSingle(),
    ]);

    const systemText = buildSystemPrompt({
        tenantName: tenant?.company_name ?? tenant?.name ?? null,
        userName: profile?.full_name ?? null,
        userEmail: user.email ?? "",
        userRole: membership?.role ?? "viewer",
        today: new Date().toISOString().slice(0, 10),
    });

    const toolDefs = getToolDefinitions();
    const toolsForApi = toolDefs.map((t, i) =>
        i === toolDefs.length - 1
            ? ({ ...t, cache_control: { type: "ephemeral" } } as Anthropic.Tool)
            : t
    );

    const messages: Anthropic.MessageParam[] = validation.data.messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    const client = getAnthropicClient();

    try {
        let turns = 0;
        while (turns < MAX_TOOL_TURNS) {
            turns++;

            const response = await client.messages.create({
                model: AI_MODEL,
                max_tokens: MAX_OUTPUT_TOKENS,
                system: [
                    {
                        type: "text",
                        text: systemText,
                        cache_control: { type: "ephemeral" },
                    },
                ],
                tools: toolsForApi,
                messages,
            });

            messages.push({ role: "assistant", content: response.content });

            if (response.stop_reason !== "tool_use") {
                const text = response.content
                    .filter((b): b is Anthropic.TextBlock => b.type === "text")
                    .map((b) => b.text)
                    .join("\n")
                    .trim();
                return NextResponse.json({
                    reply: text,
                    stop_reason: response.stop_reason,
                    turns,
                });
            }

            const toolUses = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                toolUses.map(async (use) => {
                    try {
                        const result = await executeToolCall(
                            use.name,
                            (use.input ?? {}) as Record<string, unknown>,
                            { supabase, user, tenantId }
                        );
                        return {
                            type: "tool_result",
                            tool_use_id: use.id,
                            content: JSON.stringify(result),
                        };
                    } catch (err) {
                        return {
                            type: "tool_result",
                            tool_use_id: use.id,
                            content: JSON.stringify({
                                error: err instanceof Error ? err.message : "Tool failed",
                            }),
                            is_error: true,
                        };
                    }
                })
            );

            messages.push({ role: "user", content: toolResults });
        }

        return NextResponse.json({
            reply: "I had to stop after too many steps — please try rephrasing your question.",
            stop_reason: "max_turns",
            turns,
        });
    } catch (err) {
        console.error("chat route error:", err);
        return serverError();
    }
});
