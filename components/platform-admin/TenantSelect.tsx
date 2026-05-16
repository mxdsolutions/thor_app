"use client";

import { usePlatformTenants } from "@/lib/swr";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TenantSelectProps {
    value: string | null | undefined;
    onChange: (tenantId: string | null) => void;
    placeholder?: string;
    /** Restrict to active tenants only. Defaults to true. */
    activeOnly?: boolean;
    /** Disable interaction (e.g. while saving). */
    disabled?: boolean;
    className?: string;
}

interface TenantListItem {
    id: string;
    name: string;
    company_name?: string | null;
    status?: string;
}

// Sentinel passed to onValueChange when the user picks "Clear selection".
// Radix Select doesn't allow an empty-string `value` on an item, so we use a
// distinct token and map it back to null at the boundary.
const CLEAR_VALUE = "__none__";

/**
 * Platform-admin tenant picker. Backed by `usePlatformTenants` so the same
 * dropdown can be reused across the builder sidebar, the create-template
 * modal, and anywhere else cross-tenant selection is required.
 */
export function TenantSelect({
    value,
    onChange,
    placeholder = "Select tenant…",
    activeOnly = true,
    disabled,
    className,
}: TenantSelectProps) {
    const { data, isLoading } = usePlatformTenants(undefined, activeOnly ? "active" : undefined);
    const items: TenantListItem[] = data?.items ?? [];

    return (
        <Select
            value={value || undefined}
            onValueChange={(v) => onChange(v === CLEAR_VALUE ? null : v)}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className={cn("h-9 text-sm", className)}>
                <SelectValue placeholder={isLoading ? "Loading tenants…" : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {items.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                        {t.company_name || t.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
