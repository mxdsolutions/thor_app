# Expenses — Tasks

## Receipts

- [ ] Migration: `public.receipts` + RLS + indexes
- [ ] `lib/validation.ts`: `receiptSchema`, `receiptUpdateSchema`, `RECEIPT_CATEGORIES`
- [ ] `lib/swr.ts`: `useJobReceipts(jobId)`
- [ ] API: `app/api/receipts/route.ts` (GET list, POST create)
- [ ] API: `app/api/receipts/[id]/route.ts` (GET, PATCH)
- [ ] API: `app/api/receipts/[id]/archive/route.ts`
- [ ] UI: `components/modals/CreateReceiptModal.tsx` (file picker + metadata fields)
- [ ] UI: `components/sheets/ReceiptSideSheet.tsx` (photo preview + edit + archive)

## Purchase Orders

- [ ] Migration: `companies.is_supplier` column (default false)
- [ ] Migration: `public.purchase_orders` + `public.purchase_order_line_items` + RLS + indexes
- [ ] `lib/validation.ts`: `purchaseOrderSchema`, `purchaseOrderUpdateSchema`, `createPurchaseOrderWithItemsSchema`
- [ ] `lib/swr.ts`: `useJobPurchaseOrders(jobId)`, `useQuotePurchaseOrders(quoteId)`
- [ ] `app/api/_lib/line-items.ts`: extend or copy pattern for PO totals recalc
- [ ] API: `app/api/purchase-orders/route.ts` (GET list, POST create with items)
- [ ] API: `app/api/purchase-orders/[id]/route.ts` (GET with items, PATCH)
- [ ] API: `app/api/purchase-orders/[id]/archive/route.ts`
- [ ] API: `app/api/purchase-orders/[id]/line-items/route.ts` (POST add)
- [ ] API: `app/api/purchase-orders/[id]/line-items/[itemId]/route.ts` (PATCH, DELETE)
- [ ] UI: `components/modals/CreatePurchaseOrderModal.tsx` (supplier picker + line-item checklist when seeded from quote)
- [ ] UI: `components/sheets/PurchaseOrderSideSheet.tsx` (line items table + status changes)
- [ ] UI: "Generate PO" button + progress indicator on `QuoteSideSheet`
- [ ] UI: filter `EntitySearchDropdown` for company picker by `is_supplier = true`

## Wire-up

- [ ] Replace placeholder Expenses tab content in `JobDetailView` with stacked Receipts + POs + Timesheets-placeholder sections
- [ ] Lint + typecheck
