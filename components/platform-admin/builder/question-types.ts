import {
    Type as TextIcon,
    AlignLeft as TextAreaIcon,
    Hash as NumberIcon,
    DollarSign as CurrencyIcon,
    Calendar as CalendarIcon,
    List as ListIcon,
    ToggleLeft as ToggleIcon,
    SquareCheck as CheckIcon,
    Camera as CameraIcon,
    Heading as HeadingIcon,
    Link2 as LinkIcon,
    type LucideIcon,
} from "lucide-react";
import type { FieldDef, FieldType } from "@/lib/report-templates/types";

export interface QuestionTypeMeta {
    label: string;
    icon: LucideIcon;
}

export const QUESTION_TYPE_META: Record<FieldType, QuestionTypeMeta> = {
    text: { label: "Text", icon: TextIcon },
    textarea: { label: "Long text", icon: TextAreaIcon },
    number: { label: "Number", icon: NumberIcon },
    currency: { label: "Currency", icon: CurrencyIcon },
    date: { label: "Date", icon: CalendarIcon },
    select: { label: "Multi-choice", icon: ListIcon },
    yes_no: { label: "Yes / No", icon: ToggleIcon },
    checkbox: { label: "Checkbox", icon: CheckIcon },
    photo_upload: { label: "Photo", icon: CameraIcon },
    heading: { label: "Heading", icon: HeadingIcon },
    entity_select: { label: "Linked record", icon: LinkIcon },
};

export const PRIMARY_QUESTION_TYPES: FieldType[] = [
    "text",
    "photo_upload",
    "yes_no",
    "date",
    "select",
];

export const SECONDARY_QUESTION_TYPES: FieldType[] = [
    "textarea",
    "number",
    "currency",
    "checkbox",
    "heading",
    "entity_select",
];

/**
 * Build a fresh `FieldDef` with sensible defaults for a question of `type`.
 * The id is a placeholder — callers MUST replace it via `dedupeId` against
 * the section's existing field ids before inserting. We deliberately use a
 * non-real-looking sentinel so a leaked default is obvious in the rendered
 * UI rather than silently colliding with another field.
 */
export const PENDING_FIELD_ID = "__pending__";

export function makeDefaultField(type: FieldType): FieldDef {
    const baseLabel = type === "heading" ? "New heading" : "New question";
    return {
        id: PENDING_FIELD_ID,
        label: baseLabel,
        type,
        required: false,
        width: "full",
        ...(type === "select" ? { options: [{ label: "Option 1", value: "option_1" }] } : {}),
    };
}
