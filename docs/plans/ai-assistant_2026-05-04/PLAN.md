# AI Assistant — Right-side Chat Panel

**Date:** 2026-05-04
**Author:** Calibre Media
**Status:** in-progress
**Linear:** [CLM-63 AI Assistant](https://linear.app/calibre-media/issue/CLM-63/ai-assistant) · [CLM-66 Allow enabled users to query their workspace via AI Assistant](https://linear.app/calibre-media/issue/CLM-66/allow-enabled-users-to-query-their-workspace-via-ai-assistant)

---

## Goal

Add an in-app AI assistant accessible from a collapsible right-side panel. Users can ask natural-language questions about their workspace ("how many open jobs do I have?", "find John Smith's contact details", "what quotes are due this week?") and the assistant answers by querying their tenant's data — strictly within the bounds of their role and tenant isolation.

## Approach

**MVP scope (this plan):** read-only Q&A over jobs, contacts, companies, quotes, invoices. No write actions, no conversation persistence. Single-turn UI but multi-turn server-side tool loop.

**Architecture:**
- **Backend:** New `app/api/chat/route.ts` (POST) wrapped in `withAuth`. Runs an Anthropic tool-use loop server-side. The user's authenticated `supabase` client is captured in the tool executor — every tool query runs as that user, hitting RLS, with explicit `.eq("tenant_id", tenantId)` defense-in-depth.
- **Tools (MVP):** `list_jobs`, `get_job`, `list_contacts`, `get_contact`, `list_companies`, `get_company`, `list_quotes`, `list_invoices`. All read-only.
- **Permission gating:** RLS on Postgres tables already enforces tenant isolation per session. For the MVP read-only tools, that's sufficient. When write tools land, we'll add an explicit role/permission check before each tool execution that mirrors the API-route gates.
- **Frontend:** `features/assistant/AssistantPanel.tsx` — Radix Sheet docked right, ~420px wide, fixed position. Toggle button in dashboard header. Open/close state lives in a small React context so it survives navigation.
- **Prompt caching:** System prompt + tool definitions are marked `cache_control: ephemeral` so subsequent turns within 5 min reuse the cache (significant cost win).

## Key Decisions

1. **Direct in-process tool execution, not internal HTTP fetches.** We already have the user's authenticated `supabase` client from `withAuth` — calling existing API routes via fetch would be slower and require cookie forwarding. Instead, the tool executor runs the same queries the API routes do, against the user's session. Same security guarantees (RLS + explicit `.eq("tenant_id")`), better latency.

2. **Non-streaming for MVP.** Streaming with multi-turn tool loops is more complex. The chosen model is fast enough that turn-around for typical questions stays under ~3s. We can add SSE streaming once the loop shape stabilises.

3. **No conversation persistence in MVP.** Conversation lives in client memory only — refresh wipes it. This is intentional to ship fast; a `chat_conversations` table can be added later if users ask for it.

4. **Tool registry pattern, not one giant function.** Each tool is `{ definition, execute }`. Adding a new tool means adding one entry; no chat-route changes needed.

5. **Read-only first.** Write tools (create job, archive contact, etc.) ship in a follow-up plan once we've validated the read loop and have explicit role gating per tool.

## Open Questions

- **Per-user enable flag?** CLM-66 says "enabled users". Suggest a `tenant_memberships.ai_enabled boolean default true` column in a follow-up — out of scope for the MVP code but worth flagging.
- **Rate limiting?** No quota in MVP. If usage grows, we'll add a per-tenant daily request cap.
- **Conversation history UI?** Deferred — would need persistence first.
