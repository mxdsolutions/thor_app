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

export const updatePasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
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

export const leadSchema = z.object({
    title: z.string().min(1, "Lead title is required"),
    company_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    estimated_value: z.number().optional().nullable(),
    source: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    description: z.string().optional(),
});

export const leadUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(leadSchema.partial());

export const opportunitySchema = z.object({
    title: z.string().min(1, "Opportunity title is required"),
    value: z.number().min(0, "Value must be non-negative"),
    probability: z.number().min(0).max(100).optional().nullable(),
    expected_close: z.string().optional().nullable(),
    lead_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    stage: z.string().optional(),
    assigned_to: z.string().uuid().optional().nullable(),
});

export const opportunityUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(opportunitySchema.partial());

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    initial_value: z.number().optional().nullable(),
    monthly_value: z.number().optional().nullable(),
    yearly_value: z.number().optional().nullable(),
});

export const productUpdateSchema = z.object({
    id: z.string().uuid("Valid ID is required"),
}).merge(productSchema.partial());

export const noteSchema = z.object({
    entity_type: z.string().min(1, "Entity type is required"),
    entity_id: z.string().uuid("Valid entity ID is required"),
    content: z.string().min(1, "Content is required"),
    mentioned_user_ids: z.array(z.string().uuid()).optional(),
});

// --- Line Item Schemas (shared pattern for opportunity & job line items) ---

export const lineItemSchema = z.object({
    opportunity_id: z.string().uuid().optional(),
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
    opportunity_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    paid_status: z.enum(["not_paid", "partly_paid", "paid_in_full"]).optional(),
    total_payment_received: z.number().min(0).optional(),
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

// --- Job From Opportunity Schema ---

export const jobFromOpportunitySchema = z.object({
    opportunity_id: z.string().uuid("Valid opportunity ID is required"),
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

// --- Type Exports ---

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type LineItemUpdateInput = z.infer<typeof lineItemUpdateSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type ReplyEmailInput = z.infer<typeof replyEmailSchema>;
