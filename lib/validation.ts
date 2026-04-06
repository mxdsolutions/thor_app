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
});

export const contactSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    job_title: z.string().optional(),
    company_id: z.string().uuid().optional().nullable(),
    status: z.string().optional(),
});

export const contactUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(contactSchema.partial());

export const leadSchema = z.object({
    title: z.string().min(1, "Lead title is required"),
    value: z.number().min(0, "Value must be non-negative"),
    probability: z.number().min(0).max(100).optional().nullable(),
    expected_close: z.string().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    stage: z.string().optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    reference_id: z.string().max(50).optional().nullable(),
});

export const leadUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(leadSchema.partial());

export const serviceSchema = z.object({
    name: z.string().min(1, "Service name is required"),
    description: z.string().optional(),
    initial_value: z.number().optional().nullable(),
    monthly_value: z.number().optional().nullable(),
    yearly_value: z.number().optional().nullable(),
});

export const serviceUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(serviceSchema.partial());

export const noteSchema = z.object({
    entity_type: z.string().min(1, "Entity type is required"),
    entity_id: z.string().uuid("Valid entity ID is required"),
    content: z.string().min(1, "Content is required"),
    mentioned_user_ids: z.array(z.string().uuid()).optional(),
});

// --- Line Item Schemas (shared pattern for lead & job line items) ---

export const lineItemSchema = z.object({
    lead_id: z.string().uuid().optional(),
    job_id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    quantity: z.number().min(0, "Quantity must be non-negative"),
    unit_price: z.number().min(0, "Unit price must be non-negative"),
});

export const lineItemUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
    quantity: z.number().min(0).optional(),
    unit_price: z.number().min(0).optional(),
});

// --- Job Schemas ---

export const jobSchema = z.object({
    description: z.string().min(1, "Job description is required"),
    status: z.string().optional(),
    amount: z.number().min(0).optional(),
    project_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    scheduled_date: z.string().optional().nullable(),
    lead_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
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
});

export const replyEmailSchema = z.object({
    comment: z.string().min(1, "Reply content is required"),
});

// --- Job From Lead Schema ---

export const jobFromLeadSchema = z.object({
    lead_id: z.string().uuid("Valid lead ID is required"),
    description: z.string().min(1, "Description is required").max(1000),
    company_id: z.string().uuid("Valid company ID is required"),
    assigned_to: z.string().uuid().optional().nullable(),
    line_items: z.array(z.object({
        product_id: z.string().uuid(),
        product_name: z.string().min(1).max(500),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
    })).min(1, "At least one line item is required"),
});

// --- Quote Schemas ---

export const quoteSchema = z.object({
    title: z.string().max(500).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    job_id: z.string().uuid().optional().nullable(),
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
    total_amount: z.number().min(0).optional(),
    valid_until: z.string().optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    material_margin: z.number().min(0).max(100).optional(),
    labour_margin: z.number().min(0).max(100).optional(),
});

export const quoteUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(quoteSchema.partial());

export const createQuoteWithItemsSchema = z.object({
    title: z.string().max(500).optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    valid_until: z.string().optional().nullable(),
    material_margin: z.number().min(0).max(100),
    labour_margin: z.number().min(0).max(100),
    gst_inclusive: z.boolean().optional(),
    line_items: z.array(z.object({
        pricing_matrix_id: z.string().optional().nullable(),
        description: z.string().min(1).max(500),
        trade: z.string().optional().nullable(),
        uom: z.string().optional().nullable(),
        quantity: z.number().min(0),
        material_cost: z.number().min(0),
        labour_cost: z.number().min(0),
    })).min(1, "At least one line item is required"),
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

const templateSchemaObj = z.object({
    version: z.literal(1),
    sections: z.array(sectionDefSchema),
});

export const reportTemplateCreateSchema = z.object({
    name: z.string().min(1, "Template name is required").max(200),
    slug: z.string()
        .min(2, "Slug must be at least 2 characters")
        .max(100)
        .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens"),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().min(1, "Category is required"),
    schema: templateSchemaObj.optional(),
});

export const reportTemplateUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().optional().nullable(),
    schema: templateSchemaObj.optional(),
    is_active: z.boolean().optional(),
});

export type ReportTemplateCreateInput = z.infer<typeof reportTemplateCreateSchema>;
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
    entity_type: z.enum(["lead", "job"]),
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
    plan: z.enum(["trial", "paid"]).optional(),
    max_users: z.number().min(1).max(1000).optional(),
});

export const platformTenantUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    company_name: z.string().min(1).optional(),
    plan: z.enum(["trial", "paid"]).optional(),
    max_users: z.number().min(1).max(1000).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    notes: z.string().max(5000).optional().nullable(),
    trial_ends_at: z.string().datetime().optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
});

export const platformTenantSuspendSchema = z.object({
    action: z.enum(["suspend", "reactivate"]),
});

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
export type LeadInput = z.infer<typeof leadSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type LineItemUpdateInput = z.infer<typeof lineItemUpdateSchema>;
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
