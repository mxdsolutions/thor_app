import { Home as HomeModernIcon, User as UserIcon, ShieldCheck as ShieldCheckIcon, AlertTriangle as ExclamationTriangleIcon, Camera as CameraIcon, LayoutGrid as Squares2X2Icon, DollarSign as CurrencyDollarIcon, ClipboardCheck as ClipboardDocumentCheckIcon, Link as LinkIcon } from "lucide-react";
import type { LucideIcon as TablerIcon } from "lucide-react";
import type { FieldDef } from "./types";

export interface PresetFieldGroup {
    id: string;
    name: string;
    description: string;
    icon: TablerIcon;
    fields: FieldDef[];
}

export const PRESET_FIELD_GROUPS: PresetFieldGroup[] = [
    {
        id: "property_details",
        name: "Property Details",
        description: "Address, suburb, state, postcode",
        icon: HomeModernIcon,
        fields: [
            { id: "address", label: "Address", type: "text", required: true, width: "full" },
            { id: "suburb", label: "Suburb", type: "text", width: "half" },
            {
                id: "state",
                label: "State",
                type: "select",
                width: "half",
                options: [
                    { label: "NSW", value: "nsw" },
                    { label: "VIC", value: "vic" },
                    { label: "QLD", value: "qld" },
                    { label: "WA", value: "wa" },
                    { label: "SA", value: "sa" },
                    { label: "TAS", value: "tas" },
                    { label: "ACT", value: "act" },
                    { label: "NT", value: "nt" },
                ],
            },
            { id: "postcode", label: "Postcode", type: "text", width: "half" },
        ],
    },
    {
        id: "contact_info",
        name: "Contact Info",
        description: "Name, phone, email",
        icon: UserIcon,
        fields: [
            { id: "contact_name", label: "Contact Name", type: "text", required: true, width: "full" },
            { id: "phone", label: "Phone", type: "text", width: "half", placeholder: "04XX XXX XXX" },
            { id: "email", label: "Email", type: "text", width: "half", placeholder: "email@example.com" },
        ],
    },
    {
        id: "insurance_claim",
        name: "Insurance / Claim",
        description: "Insurer, claim & policy numbers",
        icon: ShieldCheckIcon,
        fields: [
            { id: "insurer", label: "Insurer", type: "text", width: "full" },
            { id: "claim_number", label: "Claim Number", type: "text", width: "half" },
            { id: "policy_number", label: "Policy Number", type: "text", width: "half" },
        ],
    },
    {
        id: "damage_assessment",
        name: "Damage Assessment",
        description: "Type, severity, area, description",
        icon: ExclamationTriangleIcon,
        fields: [
            {
                id: "damage_type",
                label: "Damage Type",
                type: "select",
                required: true,
                width: "full",
                options: [
                    { label: "Storm", value: "storm" },
                    { label: "Hail", value: "hail" },
                    { label: "Wind", value: "wind" },
                    { label: "Water", value: "water" },
                    { label: "Fire", value: "fire" },
                    { label: "Impact", value: "impact" },
                    { label: "Wear & Tear", value: "wear_and_tear" },
                    { label: "Other", value: "other" },
                ],
            },
            {
                id: "severity",
                label: "Severity",
                type: "select",
                width: "half",
                options: [
                    { label: "Minor", value: "minor" },
                    { label: "Moderate", value: "moderate" },
                    { label: "Severe", value: "severe" },
                    { label: "Critical", value: "critical" },
                ],
            },
            { id: "affected_area", label: "Affected Area", type: "text", width: "half" },
            { id: "damage_description", label: "Description", type: "textarea", width: "full" },
        ],
    },
    {
        id: "photo_evidence",
        name: "Photo Evidence",
        description: "Photos and notes",
        icon: CameraIcon,
        fields: [
            { id: "photos", label: "Photos", type: "photo_upload", width: "full" },
            { id: "photo_notes", label: "Notes", type: "textarea", width: "full", placeholder: "Describe what the photos show..." },
        ],
    },
    {
        id: "measurements",
        name: "Measurements",
        description: "Length, width, area, height",
        icon: Squares2X2Icon,
        fields: [
            { id: "length_m", label: "Length (m)", type: "number", width: "half" },
            { id: "width_m", label: "Width (m)", type: "number", width: "half" },
            { id: "area_sqm", label: "Area (m\u00B2)", type: "number", width: "half" },
            { id: "height_m", label: "Height (m)", type: "number", width: "half" },
        ],
    },
    {
        id: "cost_pricing",
        name: "Cost / Pricing",
        description: "Item, quantity, unit cost, total",
        icon: CurrencyDollarIcon,
        fields: [
            { id: "item_description", label: "Item Description", type: "text", width: "full" },
            { id: "quantity", label: "Quantity", type: "number", width: "half" },
            { id: "unit_cost", label: "Unit Cost", type: "currency", width: "half" },
            { id: "total_cost", label: "Total", type: "currency", width: "full" },
        ],
    },
    {
        id: "sign_off",
        name: "Sign-off",
        description: "Inspector, date, notes",
        icon: ClipboardDocumentCheckIcon,
        fields: [
            { id: "inspector_name", label: "Inspector Name", type: "text", required: true, width: "half" },
            { id: "date_inspected", label: "Date Inspected", type: "date", required: true, width: "half" },
            { id: "sign_off_notes", label: "Notes", type: "textarea", width: "full" },
        ],
    },
    {
        id: "entity_references",
        name: "Entity References",
        description: "Link to jobs, companies, contacts",
        icon: LinkIcon,
        fields: [
            { id: "linked_job", label: "Linked Job", type: "entity_select", entityType: "job", width: "full" },
            { id: "linked_company", label: "Linked Company", type: "entity_select", entityType: "company", width: "half" },
            { id: "linked_contact", label: "Linked Contact", type: "entity_select", entityType: "contact", width: "half" },
        ],
    },
];
