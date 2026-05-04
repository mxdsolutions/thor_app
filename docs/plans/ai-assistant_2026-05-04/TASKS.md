# Tasks — AI Assistant

**Source:** [PLAN.md](./PLAN.md)
**Date:** 2026-05-04
**Status:** in-progress

---

## Phase 1 — MVP (read-only Q&A)

- [x] **T1** — Install `@anthropic-ai/sdk`
- [ ] **T2** — Add `ANTHROPIC_API_KEY` to `.env.local` (manual; not committed) **← user action**
- [x] **T3** — Create `lib/ai/client.ts` with model constant + Anthropic client
- [x] **T4** — Create `lib/ai/tools.ts` with read-only tool registry (jobs, contacts, companies, quotes, invoices)
- [x] **T5** — Create `app/api/chat/route.ts` — POST endpoint with tool-use loop and prompt caching
- [x] **T6** — Create `features/assistant/AssistantContext.tsx` — open/close state
- [x] **T7** — Create `features/assistant/AssistantPanel.tsx` — right-side panel UI
- [x] **T8** — Wire toggle button + panel into `DashboardShell`
- [x] **T9** — Verify `npm run lint` and `npm run build` pass

## Phase 2 — Polish (follow-up plan)

- [ ] Stream responses (SSE)
- [ ] Conversation persistence (`chat_conversations` + `chat_messages` tables, RLS)
- [ ] Write tools (create/update entities) with explicit per-tool role gating
- [ ] Per-user `ai_enabled` toggle on `tenant_memberships`
- [ ] Rate limiting per tenant
