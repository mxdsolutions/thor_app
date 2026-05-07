# Files — Tasks

- [ ] DB migration: `public.files` table + indexes + RLS
- [ ] Storage: create `tenant-files` bucket (private, 50MB) + RLS policies
- [ ] `lib/validation.ts`: `fileMetaSchema`, `fileUpdateSchema`
- [ ] `lib/swr.ts`: `useFiles`, `useJobFiles`
- [ ] `lib/routes.ts`: `FILES` route constant
- [ ] API: `app/api/files/route.ts` (GET list, POST upload — multipart)
- [ ] API: `app/api/files/[id]/route.ts` (GET with signed URL, PATCH rename)
- [ ] API: `app/api/files/[id]/archive/route.ts`
- [ ] UI: `/dashboard/files/page.tsx`
- [ ] UI: `components/modals/FileUploadModal.tsx`
- [ ] UI: `components/sheets/FileSideSheet.tsx`
- [ ] UI: wire `JobDetailView` Files tab
- [ ] Nav: add Files entry above Settings in `nav-config.ts`
- [ ] Lint + typecheck (`npm run lint`, build)
