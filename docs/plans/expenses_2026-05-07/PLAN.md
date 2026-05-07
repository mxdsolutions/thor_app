# Expenses (Receipts + Purchase Orders)

Status: in-progress
Owner: dylan

## Goal

Replace the placeholder Expenses tab on `JobDetailView` with two real sections — **Purchase Orders** and **Receipts** — plus a Timesheets placeholder card for later. Both feed into job-level finance analytics, so amounts/GST live as numeric columns from day one.

## Scope

### Receipts

- **Job-scoped only.** Tenant-level receipts are out of scope; the analytics story assumes every receipt rolls up to a job.
- Reuses the `files` table for the photo blob — `receipts.file_id → files.id`. Upload pipeline stays the existing one (multipart POST → `tenant-files` bucket → `files` row → `receipts` row).
- AI auto-extract is a v2 add. Schema is shaped for it (date/amount/gst/vendor are all nullable on insert so a future "OCR draft" flow can pre-fill, then the user confirms). No OCR-specific columns now.

**Table: `receipts`**

| column | type | notes |
|---|---|---|
| `id` | uuid | pk |
| `tenant_id` | uuid | FK tenants, NOT NULL |
| `job_id` | uuid | FK jobs, NOT NULL |
| `file_id` | uuid | FK files, NOT NULL — the photo |
| `receipt_date` | date | NULL allowed for unconfirmed AI drafts |
| `vendor_name` | text | free text — servos, hardware stores rarely match a `companies` row |
| `amount` | numeric(12,2) | total inc. GST |
| `gst_amount` | numeric(12,2) | single GST field per spec |
| `category` | text (enum-checked) | one of: `materials`, `labour`, `fuel`, `tools`, `meals`, `other` |
| `notes` | text | nullable |
| `created_by` | uuid | FK auth.users |
| `created_at`, `updated_at`, `archived_at` | standard |

**Why a fixed category list:** receipts feed analytics (e.g. "materials spend per job"). A fixed set keeps aggregation simple. Can be made tenant-configurable later, mirroring the `tenant_status_configs` pattern.

### Purchase Orders

- **Job-scoped.** Same job-only constraint as receipts.
- Vendor = a `companies` row with `is_supplier = true`. Searchable in the modal via `EntitySearchDropdown`; users can create-new inline.
- POs are cost-only — no markup, no material/labour split. They're what *you* pay your subby/supplier.

**New column: `companies.is_supplier` boolean default false** — drives the supplier filter in the PO vendor picker. We do not split suppliers into a separate table; "supplier" is a flag on a company. A company can be both customer and supplier.

**Table: `purchase_orders`**

| column | type | notes |
|---|---|---|
| `id` | uuid | pk |
| `tenant_id`, `job_id` | uuid | NOT NULL |
| `company_id` | uuid | FK companies, NOT NULL — the supplier |
| `source_quote_id` | uuid | FK quotes, nullable — set when generated from a quote |
| `reference_id` | text | tenant-unique PO number, nullable in v1 (auto-numbering deferred) |
| `title` | text | nullable |
| `status` | enum text | `draft`, `sent`, `received`, `paid` |
| `expected_date` | date | nullable |
| `total_amount` | numeric(12,2) | recomputed on line-item change |
| `gst_inclusive` | boolean | default true |
| `notes` | text | nullable |
| `created_by`, `created_at`, `updated_at`, `archived_at` | standard |

**Table: `purchase_order_line_items`**

| column | type | notes |
|---|---|---|
| `id` | uuid | pk |
| `tenant_id`, `purchase_order_id` | uuid | NOT NULL (tenant for RLS, hard-required) |
| `source_quote_line_item_id` | uuid | nullable — set when generated from a quote |
| `description` | text | NOT NULL |
| `quantity` | numeric(12,2) | NOT NULL |
| `unit_price` | numeric(12,2) | NOT NULL |
| `sort_order` | int | default 0 |
| `created_at`, `updated_at` | standard |

Recompute `purchase_orders.total_amount` server-side after any line-item insert/update/delete. Same pattern as `app/api/_lib/line-items.ts` for jobs (re-using the helper rather than reinventing it).

### Quote → PO mapping

Hybrid splitting. One quote can spawn many POs.

- **Generate PO** button on `QuoteSideSheet` opens `CreatePurchaseOrderModal` with two extra inputs:
  - **Supplier picker** (`EntitySearchDropdown`, filtered to `is_supplier = true`).
  - **Line item checklist** — every line item from the source quote, with already-allocated rows showing `PO'd to {vendor}` and unticked by default. User ticks the rows for *this* PO.
- Submit creates one `purchase_orders` row + N `purchase_order_line_items` (each carrying `source_quote_line_item_id`). The original `quote_line_items` rows are not touched.
- **Quote progress indicator:** `QuoteSideSheet` shows "X of Y line items have POs" computed from `select count(distinct source_quote_line_item_id) from purchase_order_line_items where source_quote_id = ...`. Tucked into the Details panel — not load-bearing, just informational.

Why this over auto-splitting by section/trade: real quotes don't have a clean section→supplier map. Forcing one creates wrong POs that the user has to fix. The checklist puts the human in the loop where the human actually has the answer.

### Expenses tab UX

Three stacked sections in `JobDetailView` Expenses tab (no sub-tabs):

1. **Purchase Orders** — list with create button. Each row: `{vendor}`, `{title or PO ref}`, `{status badge}`, `{total}`. Click → `PurchaseOrderSideSheet`.
2. **Receipts** — list with create button. Each row: `{thumbnail or icon}`, `{vendor}`, `{date}`, `{category}`, `{amount}`. Click → `ReceiptSideSheet`.
3. **Timesheets** — placeholder card ("Coming soon").

## Build order

1. **Receipts first** — smaller, leverages existing files plumbing, immediate value.
2. **Then POs** — bigger surface area (vendor picker, line items, quote integration).
3. Wire both into the Expenses tab.

## Open / deferred

- **PO auto-numbering** (e.g. `PO-2025-0001`) — deferred. Users can leave `reference_id` blank or type their own.
- **Receipt analytics rollups** — deferred. Schema supports it; views/queries land when the analytics page does.
- **AI receipt OCR** — deferred to v2. Plan: server-side route that takes a `file_id`, runs vision on the blob, returns a suggested receipt draft.
- **Reimbursable / paid-by-employee flags** — out of scope for v1.
- **Multi-currency** — out of scope.
- **Soft-deletes** — both tables get `archived_at` + standard archive endpoints. Line items hard-delete (per the project rule for join-table-style rows).
