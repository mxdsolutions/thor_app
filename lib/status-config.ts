export type StatusItem = {
    id: string;
    label: string;
    color: string;
    is_default: boolean;
    behaviors: string[];
};

export type EntityType = "lead" | "job";

// -- Default status arrays (exact match of the previously hardcoded values) --

export const DEFAULT_LEAD_STAGES: StatusItem[] = [
    { id: "appt_booked", label: "Appt Booked", color: "bg-blue-500", is_default: true, behaviors: [] },
    { id: "proposal_sent", label: "Proposal Sent", color: "bg-amber-500", is_default: false, behaviors: [] },
    { id: "negotiation", label: "Negotiation", color: "bg-indigo-500", is_default: false, behaviors: [] },
    { id: "closed_won", label: "Closed Won", color: "bg-emerald-500", is_default: false, behaviors: ["trigger_job_creation"] },
    { id: "closed_lost", label: "Closed Lost", color: "bg-rose-400", is_default: false, behaviors: [] },
];

export const DEFAULT_JOB_STATUSES: StatusItem[] = [
    { id: "new", label: "New", color: "bg-amber-500", is_default: true, behaviors: [] },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500", is_default: false, behaviors: [] },
    { id: "completed", label: "Completed", color: "bg-emerald-500", is_default: false, behaviors: [] },
    { id: "cancelled", label: "Cancelled", color: "bg-rose-400", is_default: false, behaviors: [] },
];

export const DEFAULTS_BY_ENTITY: Record<EntityType, StatusItem[]> = {
    lead: DEFAULT_LEAD_STAGES,
    job: DEFAULT_JOB_STATUSES,
};

/** Get the status id marked as default, falling back to the first item */
export function getDefaultStatusId(statuses: StatusItem[]): string {
    return statuses.find((s) => s.is_default)?.id ?? statuses[0]?.id ?? "new";
}

/** Check if a status has a specific behavior */
export function hasBehavior(statuses: StatusItem[], statusId: string, behavior: string): boolean {
    return statuses.find((s) => s.id === statusId)?.behaviors.includes(behavior) ?? false;
}

/** Convert statuses to Kanban column format */
export function toKanbanColumns(statuses: StatusItem[]): { id: string; label: string; color: string }[] {
    return statuses.map((s) => ({ id: s.id, label: s.label, color: s.color }));
}

/** Convert statuses to a Record keyed by id (for side sheet statusConfig) */
export function toStatusConfig(statuses: StatusItem[]): Record<string, { label: string; color: string }> {
    return Object.fromEntries(statuses.map((s) => [s.id, { label: s.label, color: s.color }]));
}

// -- Static status configs for entities not using tenant-configurable statuses --

export const QUOTE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-400" },
    sent: { label: "Sent", color: "bg-blue-500" },
    accepted: { label: "Accepted", color: "bg-emerald-500" },
    rejected: { label: "Rejected", color: "bg-red-500" },
    expired: { label: "Expired", color: "bg-amber-500" },
};

export const REPORT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-400" },
    in_progress: { label: "In Progress", color: "bg-blue-500" },
    complete: { label: "Complete", color: "bg-emerald-500" },
    submitted: { label: "Submitted", color: "bg-purple-500" },
};

export const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-400" },
    submitted: { label: "Submitted", color: "bg-blue-500" },
    authorised: { label: "Authorised", color: "bg-indigo-500" },
    paid: { label: "Paid", color: "bg-emerald-500" },
    voided: { label: "Voided", color: "bg-red-500" },
};

export const PAID_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    not_paid: { label: "Not Paid", color: "text-rose-500" },
    partly_paid: { label: "Partly Paid", color: "text-amber-500" },
    paid_in_full: { label: "Paid in Full", color: "text-emerald-500" },
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
    assessment: "Assessment",
    defect: "Defect",
    inspection: "Inspection",
    make_safe: "Make Safe",
    specialist: "Specialist",
    variation: "Variation",
    roof: "Roof",
    rectification: "Rectification",
    reinspection: "Reinspection",
    other: "Other",
};
