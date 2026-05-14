import { buildArchiveHandler } from "@/app/api/_lib/archive";

export const PATCH = buildArchiveHandler("purchase_orders", "Purchase order", "finance.invoices");
