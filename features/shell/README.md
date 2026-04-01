# Shell Feature Module

Dashboard layout shell — sidebar navigation, workspace switching, notifications, and user profile.

## Components

- **`DashboardShell`** (`app/dashboard/DashboardShell.tsx`) — Composition root, renders desktop/mobile sidebars, workspace bar, and overlays
- **`NotificationSheet`** — Slide-out panel showing notification list with read/unread state
- **`SignOutDialog`** — Confirmation dialog for sign out

## Hooks

- **`useNotifications`** — SWR-powered notification fetching (30s polling), exposes `markAllRead` / `markOneRead`
- **`useUserProfile`** — Fetches and caches user profile (name, email, initials)

## Configuration

- **`nav-config.ts`** — Workspace definitions, nav items per workspace, path-to-workspace resolver. Permission-gated settings items are computed via `getSettingsItems()`.

## Data Flow

```
useUserProfile → SWR → /profiles (Supabase direct)
useNotifications → SWR → /api/notifications (30s refresh)
                        → /api/notifications/read (mark read)
```
