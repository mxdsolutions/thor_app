"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useContactOptions, useCompanyOptions, useJobOptions } from "@/lib/swr";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import type { Quote } from "../QuoteSideSheet";

type ContactOption = { id: string; first_name: string; last_name: string; email?: string | null; company_id?: string | null };
type CompanyOption = { id: string; name: string };
type JobOption = { id: string; title: string; reference_id?: string | null; contact?: { first_name: string; last_name: string } | null };

interface Props {
    data: Quote;
    setData: React.Dispatch<React.SetStateAction<Quote | null>>;
    onUpdate?: () => void;
    open: boolean;
}

export function QuoteRelatedTab({ data, setData, onUpdate, open }: Props) {
    const { data: contactsData, isLoading: contactsLoading, mutate: mutateContacts } = useContactOptions(open);
    const { data: companiesData, isLoading: companiesLoading, mutate: mutateCompanies } = useCompanyOptions(open);
    const { data: jobsData, isLoading: jobsLoading, mutate: mutateJobs } = useJobOptions(open);

    const contactOptions: EntityOption[] = useMemo(
        () => (contactsData?.items ?? []).map((c: ContactOption) => ({
            id: c.id,
            label: `${c.first_name} ${c.last_name}`,
            subtitle: c.email,
            company_id: c.company_id,
        })),
        [contactsData]
    );

    const companyOptions: EntityOption[] = useMemo(
        () => (companiesData?.items ?? []).map((c: CompanyOption) => ({ id: c.id, label: c.name })),
        [companiesData]
    );

    const jobOptions: EntityOption[] = useMemo(
        () => (jobsData?.items ?? []).map((j: JobOption) => {
            const contactName = j.contact ? `${j.contact.first_name} ${j.contact.last_name}` : j.title;
            return { id: j.id, label: contactName, subtitle: j.reference_id || null };
        }),
        [jobsData]
    );

    const saveRelation = useCallback(async (column: string, value: string | null) => {
        const res = await fetch("/api/quotes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (!res.ok) {
            toast.error("Failed to update");
            return false;
        }
        onUpdate?.();
        return true;
    }, [data.id, onUpdate]);

    const handleContactChange = useCallback(async (id: string, option?: EntityOption) => {
        const ok = await saveRelation("contact_id", id || null);
        if (!ok) return;

        if (id && option) {
            const contact = (contactsData?.items ?? []).find((c: ContactOption) => c.id === id);
            setData(prev => prev ? {
                ...prev,
                contact_id: id,
                contact: contact ? { id: contact.id, first_name: contact.first_name, last_name: contact.last_name, email: contact.email, company_id: contact.company_id } : prev.contact,
            } : prev);

            if (option.company_id && option.company_id !== data.company_id) {
                const companyOk = await saveRelation("company_id", option.company_id);
                if (companyOk) {
                    const company = (companiesData?.items ?? []).find((c: CompanyOption) => c.id === option.company_id);
                    setData(prev => prev ? {
                        ...prev,
                        company_id: option.company_id!,
                        company: company ? { id: company.id, name: company.name } : prev.company,
                    } : prev);
                }
            }
        } else {
            setData(prev => prev ? { ...prev, contact_id: null, contact: null } : prev);
        }
    }, [saveRelation, contactsData, companiesData, data.company_id, setData]);

    const handleCompanyChange = useCallback(async (id: string) => {
        const ok = await saveRelation("company_id", id || null);
        if (!ok) return;

        if (id) {
            const company = (companiesData?.items ?? []).find((c: CompanyOption) => c.id === id);
            setData(prev => prev ? {
                ...prev,
                company_id: id,
                company: company ? { id: company.id, name: company.name } : prev.company,
            } : prev);
        } else {
            setData(prev => prev ? { ...prev, company_id: null, company: null } : prev);
        }
    }, [saveRelation, companiesData, setData]);

    const handleJobChange = useCallback(async (id: string) => {
        const ok = await saveRelation("job_id", id || null);
        if (!ok) return;

        if (id) {
            const job = (jobsData?.items ?? []).find((j: JobOption) => j.id === id);
            setData(prev => prev ? {
                ...prev,
                job_id: id,
                job: job ? { id: job.id, title: job.title } : prev.job,
            } : prev);
        } else {
            setData(prev => prev ? { ...prev, job_id: null, job: null } : prev);
        }
    }, [saveRelation, jobsData, setData]);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">Job</p>
                <EntitySearchDropdown
                    value={data.job_id || data.job?.id || ""}
                    onChange={handleJobChange}
                    options={jobOptions}
                    placeholder="Search or create job..."
                    entityType="job"
                    onCreated={() => mutateJobs()}
                    loading={jobsLoading}
                />
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">Contact</p>
                <EntitySearchDropdown
                    value={data.contact_id || data.contact?.id || ""}
                    onChange={handleContactChange}
                    options={contactOptions}
                    placeholder="Search or create contact..."
                    entityType="contact"
                    onCreated={() => mutateContacts()}
                    loading={contactsLoading}
                />
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">Company</p>
                <EntitySearchDropdown
                    value={data.company_id || data.company?.id || ""}
                    onChange={handleCompanyChange}
                    options={companyOptions}
                    placeholder="Search or create company..."
                    entityType="company"
                    onCreated={() => mutateCompanies()}
                    loading={companiesLoading}
                />
            </div>
        </div>
    );
}
