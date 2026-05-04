# THOR: Tradie OS

Multi-tenant CRM + operations dashboard for trade and service businesses.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase · Tailwind v4 · SWR · Zod · Radix UI

## Quick Start

```bash
npm install
cp .env.example .env.local  # Configure Supabase keys
npm run dev                  # localhost:3002
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Architecture, patterns, and conventions for AI-assisted development
- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** — Visual tokens, component patterns, and styling guide
- **[docs/plans/](./docs/plans/)** — Implementation plans and task tracking
- **[docs/audits/](./docs/audits/)** — Code review audits and findings

## Project Structure

```
app/          Next.js App Router (auth, dashboard, platform-admin, API routes)
components/   React components (UI primitives, modals, sheets, dashboard)
features/     Feature modules (shell, side-sheets, line-items)
lib/          Shared utilities (Supabase, SWR hooks, validation, tenant, permissions)
docs/         Plans, audits, and documentation
```

See [CLAUDE.md](./CLAUDE.md) for full architecture details.
