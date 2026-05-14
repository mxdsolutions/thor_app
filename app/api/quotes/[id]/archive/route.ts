import { buildArchiveHandler } from "@/app/api/_lib/archive";

export const PATCH = buildArchiveHandler("quotes", "Quote", "finance.quotes");
