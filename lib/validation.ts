import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const onboardingSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
});

// --- API Route Schemas ---

// Body schema for archive/unarchive endpoints (PATCH /api/{entity}/[id]/archive).
export const archiveActionSchema = z.object({
    archived: z.boolean(),
});
export type ArchiveActionInput = z.infer<typeof archiveActionSchema>;

export const companySchema = z.object({
    name: z.string().min(1, "Company name is required"),
    industry: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    website: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    postcode: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    is_supplier: z.boolean().optional(),
});

export const companyUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(companySchema.partial());
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

export const contactSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    type: z.enum(["business", "customer"]).optional(),
    job_title: z.string().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    status: z.string().optional(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
});

export const contactUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(contactSchema.partial());

export const noteSchema = z.object({
    entity_type: z.string().min(1, "Entity type is required"),
    entity_id: z.string().uuid("Valid entity ID is required"),
    content: z.string().min(1, "Content is required"),
    mentioned_user_ids: z.array(z.string().uuid()).optional(),
});

// --- Job Schemas ---

export const jobSchema = z.object({
    job_title: z.string().min(1, "Job name is required"),
    description: z.string().optional().nullable(),
    status: z.string().optional(),
    amount: z.number().min(0).optional(),
    project_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    scheduled_date: z.string().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
    paid_status: z.enum(["not_paid", "partly_paid", "paid_in_full"]).optional(),
    total_payment_received: z.number().min(0).optional(),
    reference_id: z.string().max(50).optional().nullable(),
});

export const jobUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(jobSchema.partial());

// --- Email Schemas ---

export const sendEmailSchema = z.object({
    to: z.array(z.string().email()).min(1, "At least one recipient required"),
    cc: z.array(z.string().email()).optional(),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
    contentType: z.enum(["HTML", "Text"]).optional().default("HTML"),
    attachments: z.array(z.object({
        name: z.string(),
        contentType: z.string(),
        contentBytes: z.string(), // base64
    })).optional(),
});

export const replyEmailSchema = z.object({
    comment: z.string().min(1, "Reply content is required"),
    to: z.array(z.string().email()).min(1, "At least one recipient is required"),
    cc: z.array(z.string().email()).optional(),
});

// --- Quote Schemas ---

export const quoteSchema = z.object({
    title: z.string().max(500).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    scope_description: z.string().max(5000).optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
    total_amount: z.number().min(0).optional(),
    valid_until: z.string().optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    material_margin: z.number().min(0).max(100).optional(),
    labour_margin: z.number().min(0).max(100).optional(),
    gst_inclusive: z.boolean().optional(),
});

export const quoteUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(quoteSchema.partial());

const quoteLineItemInput = z.object({
    pricing_matrix_id: z.string().optional().nullable(),
    description: z.string().min(1).max(500),
    line_description: z.string().max(1000).optional().nullable(),
    trade: z.string().optional().nullable(),
    uom: z.string().optional().nullable(),
    quantity: z.number().min(0),
    material_cost: z.number().min(0),
    labour_cost: z.number().min(0),
    sort_order: z.number().int().min(0).optional(),
});

export const createQuoteWithItemsSchema = z.object({
    title: z.string().max(500).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    scope_description: z.string().max(5000).optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
    valid_until: z.string().optional().nullable(),
    material_margin: z.number().min(0).max(100),
    labour_margin: z.number().min(0).max(100),
    gst_inclusive: z.boolean().optional(),
    sections: z.array(z.object({
        name: z.string().min(1).max(200),
        sort_order: z.number().int().min(0),
        items: z.array(quoteLineItemInput),
    })).optional(),
    line_items: z.array(quoteLineItemInput).optional(),
});

// --- Report Schemas ---

export const reportSchema = z.object({
    title: z.string().min(1, "Title is required").max(500),
    type: z.string().min(1, "Report type is required"),
    status: z.enum(["draft", "in_progress", "complete", "submitted"]).optional(),
    job_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    template_id: z.string().uuid().optional().nullable(),
    data: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().max(5000).optional().nullable(),
});

export const reportUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(reportSchema.partial());

// --- Report Share-Token Schemas ---

/** Body for POST /api/reports/[id]/share-tokens. The dashboard mints a link
 *  for an external party. Recipient name/email/message are optional metadata
 *  and gate whether the THOR-branded email is sent. */
export const createShareTokenSchema = z.object({
    recipient_name: z.string().max(200).optional().nullable(),
    recipient_email: z.string().email("Invalid email").max(320).optional().nullable(),
    message: z.string().max(2000).optional().nullable(),
    expires_in_days: z.number().int().min(1).max(90).optional(),
});
export type CreateShareTokenInput = z.infer<typeof createShareTokenSchema>;

/** Body for PATCH /api/public/reports/[token] — autosave from the external
 *  completion page. Only the data blob is mutable; everything else is locked
 *  by the token row. */
export const sharedReportAutosaveSchema = z.object({
    data: z.record(z.string(), z.unknown()),
});
export type SharedReportAutosaveInput = z.infer<typeof sharedReportAutosaveSchema>;

/** Body for POST /api/public/reports/[token]/submit. Identity is required so
 *  the dashboard can show "Submitted by ..." */
export const submitSharedReportSchema = z.object({
    data: z.record(z.string(), z.unknown()),
    submitted_by_name: z.string().min(1, "Your name is required").max(200),
    submitted_by_email: z.string().email("Valid email is required").max(320),
});
export type SubmitSharedReportInput = z.infer<typeof submitSharedReportSchema>;

// --- License Schemas ---

export const licenseSchema = z.object({
    name: z.string().min(1, "License name is required"),
    license_number: z.string().min(1, "License number is required"),
    issuing_authority: z.string().optional(),
    expiry_date: z.string().optional().nullable(),
    status: z.enum(["active", "expired", "suspended"]).optional(),
});

export const licenseUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(licenseSchema.partial());

// --- Invoice Schemas ---

export const invoiceSchema = z.object({
    invoice_number: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
    quote_id: z.string().uuid().optional().nullable(),
    status: z.enum(["draft", "submitted", "authorised", "paid", "voided"]).optional(),
    type: z.enum(["ACCREC", "ACCPAY"]).optional(),
    currency_code: z.string().optional(),
    issue_date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    gst_inclusive: z.boolean().optional(),
    line_items: z.array(z.object({
        description: z.string().min(1).max(500),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
        account_code: z.string().optional().nullable(),
    })).optional(),
});

export const invoiceUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(invoiceSchema.partial());

// --- Report Template Schemas ---

const fieldDefSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["text", "textarea", "number", "currency", "date", "select", "yes_no", "checkbox", "photo_upload", "heading", "entity_select"]),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    width: z.enum(["full", "half"]).optional(),
    entityType: z.enum(["job", "company", "contact"]).optional(),
    autoPopulateKey: z.string().optional(),
});

const sectionDefSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["standard", "repeater"]),
    fields: z.array(fieldDefSchema),
    minItems: z.number().min(0).optional(),
    maxItems: z.number().min(1).optional(),
    addLabel: z.string().optional(),
});

// Schema version: must match `LATEST_SCHEMA_VERSION` in
// lib/report-templates/defaults.ts. Hard-coded as a literal here to keep this
// module Zod-only (no runtime imports beyond zod). Bump both when shipping v2.
const templateSchemaObj = z.object({
    version: z.literal(1),
    sections: z.array(sectionDefSchema),
});

// Postgres `uuid` accepts any 8-4-4-4-12 hex shape — including the nil UUID
// and seed ids like `00000000-0000-0000-0000-000000000001`. Zod's `.uuid()`
// follows RFC 4122 strictly (version nibble must be 1–5), which would reject
// those legitimate Postgres ids. Match the database's behaviour instead.
const pgUuid = z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Must be a valid UUID",
);

export const reportTemplateCreateSchema = z.object({
    name: z.string().min(1, "Template name is required").max(200),
    slug: z.string()
        .min(2, "Slug must be at least 2 characters")
        .max(100)
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens"),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().min(1, "Category is required"),
    schema: templateSchemaObj.optional(),
    tenant_id: pgUuid,
    report_cover_url: z.string().url().optional().nullable(),
});

export const reportTemplateUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().optional().nullable(),
    schema: templateSchemaObj.optional(),
    is_active: z.boolean().optional(),
    tenant_id: pgUuid.optional().nullable(),
    report_cover_url: z.string().url().optional().nullable(),
});

/**
 * Tenant-scoped create payload. The `tenant_id` is set server-side from the
 * auth context (not the request body) so callers can't impersonate other
 * tenants — defence in depth on top of `withAuth`'s tenant resolution.
 */
export const reportTemplateTenantCreateSchema = reportTemplateCreateSchema.omit({ tenant_id: true });

export type ReportTemplateCreateInput = z.infer<typeof reportTemplateCreateSchema>;
export type ReportTemplateTenantCreateInput = z.infer<typeof reportTemplateTenantCreateSchema>;
export type ReportTemplateUpdateInput = z.infer<typeof reportTemplateUpdateSchema>;

// --- Tenant Config Schemas ---

const statusItemSchema = z.object({
    id: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Status ID must be lowercase letters, numbers, and underscores"),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    is_default: z.boolean(),
    behaviors: z.array(z.string()),
});

export const statusConfigUpdateSchema = z.object({
    tenant_id: z.string().uuid(),
    entity_type: z.enum(["job"]),
    statuses: z.array(statusItemSchema)
        .min(1, "At least one status is required")
        .refine(
            (statuses) => statuses.filter((s) => s.is_default).length === 1,
            "Exactly one status must be marked as default"
        ),
});

export const moduleConfigUpdateSchema = z.object({
    tenant_id: z.string().uuid(),
    modules: z.array(z.object({
        module_id: z.string().min(1).max(100),
        enabled: z.boolean(),
    })).min(1, "At least one module is required"),
});

export type StatusConfigUpdateInput = z.infer<typeof statusConfigUpdateSchema>;
export type ModuleConfigUpdateInput = z.infer<typeof moduleConfigUpdateSchema>;

// --- Platform Admin Schemas ---

export const platformTenantCreateSchema = z.object({
    company_name: z.string().min(1, "Company name is required"),
    slug: z.string()
        .min(3, "Slug must be at least 3 characters")
        .max(48, "Slug must be 48 characters or less")
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    owner_email: z.string().email("Invalid owner email"),
    owner_name: z.string().min(1, "Owner name is required"),
});

export const platformTenantUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    company_name: z.string().min(1).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    notes: z.string().max(5000).optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
});

export const platformTenantSuspendSchema = z.object({
    action: z.enum(["suspend", "reactivate"]),
});

// --- Stripe Schemas ---

export const stripeCheckoutSchema = z.object({
    price_id: z.string().min(1, "price_id is required"),
    // When true, post-checkout redirects return to the signup wizard's invite
    // step (success) or plan step (cancel) instead of the settings page.
    from_signup: z.boolean().optional(),
});

export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;

export const stripeSeatsUpdateSchema = z.object({
    delta: z
        .number()
        .int("delta must be an integer")
        .refine((v) => v !== 0, { message: "delta must be non-zero" }),
});

export type StripeSeatsUpdateInput = z.infer<typeof stripeSeatsUpdateSchema>;

export type PlatformTenantCreateInput = z.infer<typeof platformTenantCreateSchema>;
export type PlatformTenantUpdateInput = z.infer<typeof platformTenantUpdateSchema>;
export type PlatformTenantSuspendInput = z.infer<typeof platformTenantSuspendSchema>;

// --- Type Exports ---

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type ReplyEmailInput = z.infer<typeof replyEmailSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
export type CreateQuoteWithItemsInput = z.infer<typeof createQuoteWithItemsSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type LicenseInput = z.infer<typeof licenseSchema>;
export type LicenseUpdateInput = z.infer<typeof licenseUpdateSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

// --- File Schemas ---

/** Hard cap mirrored from the storage bucket — keep in sync with the migration. */
export const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** Server-side metadata produced from a successful upload. The browser sends
 *  the binary via multipart `FormData`, not JSON, so this schema validates
 *  the *side data* (job_id) sent alongside the file. */
export const fileUploadMetaSchema = z.object({
    job_id: z.string().uuid().optional().nullable(),
});
export type FileUploadMetaInput = z.infer<typeof fileUploadMetaSchema>;

export const fileUpdateSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
});
export type FileUpdateInput = z.infer<typeof fileUpdateSchema>;

// --- Receipt Schemas ---

/** Fixed category list — mirror the CHECK constraint on `receipts.category`.
 *  Kept as a fixed enum (not tenant-config) for v1 so analytics rollups
 *  ("materials spend per job") have a stable shape. Can be promoted to a
 *  tenant_status_configs-style config later. */
export const RECEIPT_CATEGORIES = ["materials", "labour", "fuel", "tools", "meals", "other"] as const;
export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

/** Body schema for `POST /api/receipts`. The photo upload happens first (via
 *  the existing `/api/files` flow) and produces a `file_id`; the client then
 *  posts the metadata + that file_id here. Date / amount fields are optional
 *  on insert so an AI-extract draft can be saved before the user confirms
 *  every value. */
export const receiptSchema = z.object({
    job_id: z.string().uuid("Job is required"),
    file_id: z.string().uuid("File is required"),
    receipt_date: z.string().optional().nullable(),
    vendor_name: z.string().max(200).optional().nullable(),
    amount: z.number().min(0).optional().nullable(),
    gst_amount: z.number().min(0).optional().nullable(),
    category: z.enum(RECEIPT_CATEGORIES).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;

export const receiptUpdateSchema = z.object({
    receipt_date: z.string().optional().nullable(),
    vendor_name: z.string().max(200).optional().nullable(),
    amount: z.number().min(0).optional().nullable(),
    gst_amount: z.number().min(0).optional().nullable(),
    category: z.enum(RECEIPT_CATEGORIES).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
});
export type ReceiptUpdateInput = z.infer<typeof receiptUpdateSchema>;

// --- Purchase Order Schemas ---

export const PURCHASE_ORDER_STATUSES = ["draft", "sent", "received", "paid"] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

const poLineItemInput = z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().min(0),
    unit_price: z.number().min(0),
    source_quote_line_item_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().min(0).optional(),
});

/** Body schema for `POST /api/purchase-orders`. Always job-scoped and
 *  always addressed to a supplier company. `line_items` is optional so a
 *  bare-bones PO can be created and filled in later. */
export const createPurchaseOrderSchema = z.object({
    job_id: z.string().uuid("Job is required"),
    company_id: z.string().uuid("Supplier is required"),
    source_quote_id: z.string().uuid().optional().nullable(),
    title: z.string().max(500).optional().nullable(),
    reference_id: z.string().max(50).optional().nullable(),
    status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
    expected_date: z.string().optional().nullable(),
    gst_inclusive: z.boolean().optional(),
    notes: z.string().max(5000).optional().nullable(),
    line_items: z.array(poLineItemInput).optional(),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const purchaseOrderUpdateSchema = z.object({
    title: z.string().max(500).optional().nullable(),
    reference_id: z.string().max(50).optional().nullable(),
    status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
    expected_date: z.string().optional().nullable(),
    company_id: z.string().uuid().optional(),
    gst_inclusive: z.boolean().optional(),
    notes: z.string().max(5000).optional().nullable(),
});
export type PurchaseOrderUpdateInput = z.infer<typeof purchaseOrderUpdateSchema>;

export const purchaseOrderLineItemSchema = poLineItemInput;
export type PurchaseOrderLineItemInput = z.infer<typeof purchaseOrderLineItemSchema>;

export const purchaseOrderLineItemUpdateSchema = z.object({
    description: z.string().min(1).max(500).optional(),
    quantity: z.number().min(0).optional(),
    unit_price: z.number().min(0).optional(),
    sort_order: z.number().int().min(0).optional(),
});
export type PurchaseOrderLineItemUpdateInput = z.infer<typeof purchaseOrderLineItemUpdateSchema>;

// ── Tasks ──────────────────────────────────────────
export const taskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
    priority: z.number().int().min(1).max(4).default(3),
    due_date: z.string().nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    job_id: z.string().uuid().nullable().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const taskUpdateSchema = taskSchema.partial();
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const scheduleEntrySchema = z.object({
    job_id: z.string().uuid("Job is required"),
    date: z.string().min(1, "Date is required"),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;

export const scheduleEntryUpdateSchema = z.object({
    id: z.string().uuid(),
    date: z.string().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});
export type ScheduleEntryUpdateInput = z.infer<typeof scheduleEntryUpdateSchema>;

// --- Timesheet Schemas ---

export const TIMESHEET_SOURCES = ["manual", "clock"] as const;
export type TimesheetSource = (typeof TIMESHEET_SOURCES)[number];

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid date/time",
});

export const timesheetSchema = z.object({
    user_id: z.string().uuid("Employee is required"),
    job_id: z.string().uuid().optional().nullable(),
    start_at: isoDateTime,
    end_at: isoDateTime.optional().nullable(),
    notes: z.string().optional().nullable(),
    source: z.enum(TIMESHEET_SOURCES).optional(),
}).refine(
    (v) => v.end_at == null || Date.parse(v.end_at) >= Date.parse(v.start_at),
    { message: "End must be after start", path: ["end_at"] },
);
export type TimesheetInput = z.infer<typeof timesheetSchema>;

export const timesheetUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
    user_id: z.string().uuid().optional(),
    job_id: z.string().uuid().optional().nullable(),
    start_at: isoDateTime.optional(),
    end_at: isoDateTime.optional().nullable(),
    notes: z.string().optional().nullable(),
});
export type TimesheetUpdateInput = z.infer<typeof timesheetUpdateSchema>;

/** Clock-in: opens an entry with end_at NULL. */
export const timesheetClockInSchema = z.object({
    job_id: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
});
export type TimesheetClockInInput = z.infer<typeof timesheetClockInSchema>;

// --- Analytics ---

export const ANALYTICS_PERIODS = ["30d", "90d", "qtd", "ytd", "all"] as const;
export const analyticsQuerySchema = z.object({
    period: z.enum(ANALYTICS_PERIODS).default("90d"),
});
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

// --- Profile ---

/** PATCH /api/profile body. All fields optional — only provided keys update. */
export const profileUpdateSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    hourlyRate: z.number().min(0, "Hourly rate must be ≥ 0").optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** PATCH /api/users body for editing another user's profile fields. */
export const userProfileUpdateSchema = z.object({
    user_id: z.string().uuid("Valid user_id is required"),
    hourly_rate: z.number().min(0, "Hourly rate must be ≥ 0").optional(),
    position: z.string().optional().nullable(),
});
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
