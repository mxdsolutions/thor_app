import type { NewLineItem } from "@/components/quotes/PricingSearchDropdown";

export type Section = {
    id: string;
    name: string;
    items: NewLineItem[];
};

export type ContactOption = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company_id: string | null;
    company?: { id: string; name: string } | null;
};
