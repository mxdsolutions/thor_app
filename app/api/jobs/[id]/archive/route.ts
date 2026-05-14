import { buildArchiveHandler } from "@/app/api/_lib/archive";

export const PATCH = buildArchiveHandler("jobs", "Job", "ops.jobs");
