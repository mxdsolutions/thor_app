"use client";

import { useMemo } from "react";
import { EntitySearchDropdown, type EntityOption } from "./entity-search-dropdown";
import { useJobs } from "@/lib/swr";

export type JobSearchOption = {
    id: string;
    job_title?: string | null;
    title?: string | null;
    reference_id?: string | null;
    contact?: {
        address?: string | null;
        postcode?: string | null;
    } | null;
};

function extractSuburb(address?: string | null, postcode?: string | null): string | null {
    if (address) {
        const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) return parts[parts.length - 2];
        if (parts.length === 1) return parts[0];
    }
    return postcode || null;
}

export function buildJobOptions(jobs: JobSearchOption[]): EntityOption[] {
    return jobs.map((j) => {
        const suburb = extractSuburb(j.contact?.address, j.contact?.postcode);
        const parts = [j.reference_id, suburb].filter(Boolean);
        return {
            id: j.id,
            label: j.job_title || j.title || j.reference_id || "Untitled Job",
            subtitle: parts.length > 0 ? parts.join(" \u00B7 ") : null,
        };
    });
}

interface JobSearchSelectProps {
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
    allowCreate?: boolean;
    onCreated?: () => void;
    className?: string;
    disabled?: boolean;
}

/**
 * Custom job picker: shows job title as label, and reference_id · suburb as subtitle.
 * Prefer this over native `<select>` so the rich secondary info is visible.
 */
export function JobSearchSelect({
    value,
    onChange,
    placeholder = "Search jobs...",
    allowCreate,
    onCreated,
    className,
    disabled,
}: JobSearchSelectProps) {
    const { data, isLoading, mutate } = useJobs();
    const options = useMemo(
        () => buildJobOptions((data?.items as JobSearchOption[]) ?? []),
        [data]
    );

    return (
        <EntitySearchDropdown
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
            entityType={allowCreate ? "job" : undefined}
            onCreated={() => {
                mutate();
                onCreated?.();
            }}
            loading={isLoading}
            className={className}
            disabled={disabled}
        />
    );
}
