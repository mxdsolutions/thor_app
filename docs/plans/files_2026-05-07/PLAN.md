# Files

Status: in-progress
Owner: dylan

## Goal

Let tenants upload and manage files at two scopes:

1. **Tenant-level** — a top-level "Files" dashboard page (e.g. company policies, brand assets, generic docs).
2. **Job-level** — a "Files" tab on the job detail view (drawings, photos, site docs).

Files belong to one tenant; `job_id` is optional. Tenant-level files have `job_id = null`.

## Approach

**Storage:** new private Supabase Storage bucket `tenant-files`, 50MB limit, all mime types allowed. Object path: `{tenant_id}/{file_id}{ext}` so the storage RLS policy can authorise reads/writes by matching the path's first segment against `get_user_tenant_id()`.

**Table:** `public.files`
- `id`, `tenant_id`, `job_id` (nullable, FK on jobs), `name`, `storage_path`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`, `updated_at`, `archived_at`.
- RLS keyed off `tenant_id = get_user_tenant_id()`.
- Soft-delete via `archived_at` per the project rule (no hard deletes for business entities). The Storage object stays put; we only flip the row.

**API routes:**
- `GET /api/files?job_id=&archive=` — list, with optional job filter.
- `POST /api/files` — multipart upload (browser sends `FormData` with `file` + optional `job_id`). Server validates size/mime, uploads to storage, then inserts the row.
- `GET /api/files/[id]` — returns row + a short-lived signed URL for download.
- `PATCH /api/files/[id]` — rename only (`name`).
- `PATCH /api/files/[id]/archive` — soft delete via `buildArchiveHandler`.

**Validation:** server-side size/mime check belt-and-braces — bucket has limits but we double-check before writing the row.

**UI:**
- `/dashboard/files` — table page, search by name, archive scope filter, upload button. Shows file name, size, type, scope ("Tenant" or job ref), uploaded by, created date.
- `JobDetailView` Files tab replaces the existing "coming soon" placeholder with a list scoped to the job.
- `FileUploadModal` — drag-and-drop zone, accepts multiple files, optional `job_id` (locked when launched from a job).
- `FileSideSheet` — read-only metadata + rename + download + archive.
- `useFiles(jobId?, search?, archive?)` SWR hook.
- New nav entry "Files" added at the end of `NAV_ITEMS` so it sits directly above Settings (Settings is appended in `DashboardShell`).

## Open questions / deferred

- **Folders / tags** — flat list for v1.
- **Versioning** — none for v1; re-uploading creates a new row.
- **Permissions resource** — no per-role gating in v1; everyone in the tenant can upload/view/archive. Add later when the permission map is reworked.
- **Module gating** — Files has no `moduleId` (always available), like Analytics.
