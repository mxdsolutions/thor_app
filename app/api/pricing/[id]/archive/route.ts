import { buildArchiveHandler } from "@/app/api/_lib/archive";

// Pricing rows use `Matrix_ID` as the primary key (text) and have no
// `updated_at` column.
export const PATCH = buildArchiveHandler("pricing", "Pricing item", {
    pkColumn: "Matrix_ID",
    touchUpdatedAt: false,
});
