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
    | "job.company.name"
    | "job.company.email"
    | "job.company.phone"
    | "job.company.address"
    | "job.company.postcode";

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
    { value: "job.company.name", label: "Company Name", fieldTypes: ["text"] },
    { value: "job.company.email", label: "Company Email", fieldTypes: ["text"] },
    { value: "job.company.phone", label: "Company Phone", fieldTypes: ["text"] },
    { value: "job.company.address", label: "Company Address", fieldTypes: ["text", "textarea"] },
    { value: "job.company.postcode", label: "Company Postcode", fieldTypes: ["text"] },
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
