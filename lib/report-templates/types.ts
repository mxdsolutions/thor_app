export type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "currency"
    | "date"
    | "select"
    | "yes_no"
    | "checkbox"
    | "photo_upload"
    | "heading"
    | "entity_select";

export type EntityType = "job" | "company" | "contact";

export type AutoPopulateKey =
    | "job.job_title"
    | "job.description"
    | "job.status"
    | "job.amount"
    | "job.scheduled_date"
    | "job.contact.name"
    | "job.contact.first_name"
    | "job.contact.last_name"
    | "job.contact.email"
    | "job.contact.phone"
    | "job.contact.address"
    | "job.contact.postcode";

export interface FieldDef {
    id: string;
    label: string;
    type: FieldType;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: { label: string; value: string }[];
    width?: "full" | "half";
    entityType?: EntityType;
    autoPopulateKey?: AutoPopulateKey;
}

export interface SectionDef {
    id: string;
    title: string;
    description?: string;
    type: "standard" | "repeater";
    fields: FieldDef[];
    minItems?: number;
    maxItems?: number;
    addLabel?: string;
}

export interface TemplateSchema {
    version: 1;
    sections: SectionDef[];
}

export interface ReportTemplate {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    schema: TemplateSchema;
    is_active: boolean;
    version: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    /** Tenant that owns this template. NULL for legacy / platform-shared templates. */
    tenant_id: string | null;
    /** Optional PDF cover override. When set, overrides tenant.report_cover_url at PDF render time. */
    report_cover_url: string | null;
    /**
     * Embedded tenant relation. Only present on platform-admin list responses
     * that join `tenants` — single-template GETs leave this undefined.
     */
    tenant?: { id: string; name: string; company_name: string | null } | null;
    /**
     * Embedded creator profile. Only present on platform-admin list responses
     * (resolved server-side from `created_by` → `profiles`). Undefined elsewhere.
     */
    created_by_user?: { id: string; full_name: string | null; email: string | null } | null;
}

export type PhotoItem = {
    url: string;
    caption?: string;
    filename: string;
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: "Text",
    textarea: "Text Area",
    number: "Number",
    currency: "Currency",
    date: "Date",
    select: "Select",
    yes_no: "Yes / No",
    checkbox: "Checkbox",
    photo_upload: "Photo Upload",
    heading: "Heading",
    entity_select: "Entity Select",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
    job: "Job",
    company: "Company",
    contact: "Contact",
};

export const AUTO_POPULATE_KEYS: { value: AutoPopulateKey; label: string; fieldTypes: FieldType[] }[] = [
    { value: "job.job_title", label: "Job Name", fieldTypes: ["text"] },
    { value: "job.description", label: "Job Description", fieldTypes: ["text", "textarea"] },
    { value: "job.status", label: "Job Status", fieldTypes: ["text", "select"] },
    { value: "job.amount", label: "Job Amount", fieldTypes: ["number", "currency"] },
    { value: "job.scheduled_date", label: "Job Scheduled Date", fieldTypes: ["date", "text"] },
    { value: "job.contact.name", label: "Contact Full Name", fieldTypes: ["text"] },
    { value: "job.contact.first_name", label: "Contact First Name", fieldTypes: ["text"] },
    { value: "job.contact.last_name", label: "Contact Last Name", fieldTypes: ["text"] },
    { value: "job.contact.email", label: "Contact Email", fieldTypes: ["text"] },
    { value: "job.contact.phone", label: "Contact Phone", fieldTypes: ["text"] },
    { value: "job.contact.address", label: "Contact Address", fieldTypes: ["text", "textarea"] },
    { value: "job.contact.postcode", label: "Contact Postcode", fieldTypes: ["text"] },
];

export const TEMPLATE_CATEGORIES = [
    { value: "assessment", label: "Assessment" },
    { value: "defect", label: "Defect" },
    { value: "inspection", label: "Inspection" },
    { value: "make_safe", label: "Make Safe" },
    { value: "specialist", label: "Specialist" },
    { value: "variation", label: "Variation" },
    { value: "roof", label: "Roof" },
    { value: "rectification", label: "Rectification" },
    { value: "reinspection", label: "Reinspection" },
    { value: "other", label: "Other" },
];
