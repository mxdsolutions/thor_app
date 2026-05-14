import { buildArchiveHandler } from "@/app/api/_lib/archive";

export const PATCH = buildArchiveHandler("timesheets", "Timesheet", "ops.timesheets");
