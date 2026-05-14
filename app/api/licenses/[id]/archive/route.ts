import { buildArchiveHandler } from "@/app/api/_lib/archive";

export const PATCH = buildArchiveHandler("tenant_licenses", "License", "ops.jobs");
