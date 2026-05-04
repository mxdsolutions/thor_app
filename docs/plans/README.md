# Plans

Structured planning docs for THOR: Tradie OS. Each plan gets its own folder with a plan document and linked task list.

## Conventions

### Folder naming

```
{slug}_{YYYY-MM-DD}/
```

- **slug**: kebab-case description (e.g. `multi-tenancy`, `auth-hardening`)
- **date**: creation date

### Files per plan

| File | Purpose |
|------|---------|
| `PLAN.md` | The plan itself — goal, approach, key decisions |
| `TASKS.md` | Checkbox task list linked back to the plan |

### Status lifecycle

```
draft → approved → in-progress → complete
                                → abandoned
```

Both `PLAN.md` and `TASKS.md` carry a **Status** field that should be kept in sync.

---

## PLAN.md template

```markdown
# {Plan Title}

**Date:** YYYY-MM-DD
**Author:** {name}
**Status:** draft | approved | in-progress | complete | abandoned

---

## Goal
What this plan aims to achieve and why.

## Approach
How we'll accomplish the goal.

## Key Decisions
Important choices made and their rationale.

## Open Questions
Unresolved items that need answers.
```

## TASKS.md template

```markdown
# Tasks — {Plan Title}

**Source:** [PLAN.md](./PLAN.md)
**Date:** YYYY-MM-DD
**Status:** not-started | in-progress | complete

---

## Phase 1 — {Phase Name}

- [ ] **T1** — Task description
- [ ] **T2** — Task description

## Phase 2 — {Phase Name}

- [ ] **T3** — Task description
```

Task IDs use a simple `T{n}` prefix. Group tasks by phase or priority. Check off tasks as they're completed.

---

## Plan Index

| Plan | Status | Date |
|------|--------|------|
| [Permissions Revamp](./permissions-revamp_2026-04-23/PLAN.md) | approved | 2026-04-23 |
| [Stripe Integration](./stripe-integration_2026-04-25/PLAN.md) | in-progress | 2026-04-25 |
| [AI Assistant](./ai-assistant_2026-05-04/PLAN.md) | in-progress | 2026-05-04 |
