"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { formatCurrency } from "@/lib/utils";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { Button } from "@/components/ui/button";
import { IconDownload as ArrowDownTrayIcon, IconPencil as PencilIcon, IconSend as SendIcon } from "@tabler/icons-react";
import { useTenantOptional } from "@/lib/tenant-context";
import { toast } from "sonner";
import { QUOTE_STATUS_CONFIG } from "@/lib/status-config";
import { useContactOptions, useCompanyOptions, useJobOptions } from "@/lib/swr";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import useSWR from "swr";

const EditQuoteModal = lazy(() =>
    import("@/components/modals/EditQuoteModal").then(mod => ({ default: mod.EditQuoteModal }))
);
const ComposeEmailModal = lazy(() =>
    import("@/components/modals/ComposeEmailModal").then(mod => ({ default: mod.ComposeEmailModal }))
);

type Quote = {
    id: string;
    title: string;
    description: string | null;
    scope_description?: string | null;
    status: string;
    total_amount: number;
    valid_until: string | null;
    notes: string | null;
    created_at: string;
    material_margin?: number | null;
    labour_margin?: number | null;
    contact_id?: string | null;
    company_id?: string | null;
    job_id?: string | null;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string; email?: string | null; company_id?: string | null } | null;
    job?: { id: string; title: string; status?: string } | null;
};

interface QuoteSideSheetProps {
    quote: Quote | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig = QUOTE_STATUS_CONFIG;

/** Side sheet for viewing/editing quote details, line items, and margin calculations. */
export function QuoteSideSheet({ quote, open, onOpenChange, onUpdate }: QuoteSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Quote | null>(quote);
    const [downloading, setDownloading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [emailDefaults, setEmailDefaults] = useState<{
        to: string;
        subject: string;
        body: string;
        attachments: { name: string; contentType: string; contentBytes: string }[];
    } | null>(null);
    const tenant = useTenantOptional();
    const { data: outlookStatus } = useSWR(open ? "/api/integrations/outlook" : null, (url: string) => fetch(url).then(r => r.json()));
    const hasEmailIntegration = outlookStatus?.connected === true;

    useEffect(() => { setData(quote); }, [quote]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    /** Generate the quote PDF blob */
    const generatePDFBlob = useCallback(async (): Promise<Blob> => {
        const [quoteRes, liRes, secRes] = await Promise.all([
            fetch(`/api/quotes?search=${encodeURIComponent(data!.title)}&limit=1`),
            fetch(`/api/quote-line-items?quote_id=${data!.id}`),
            fetch(`/api/quote-sections?quote_id=${data!.id}`),
        ]);
        const [quoteData, liData, secData] = await Promise.all([quoteRes.json(), liRes.json(), secRes.json()]);
        const fullQuote = quoteData.items?.find((q: Quote) => q.id === data!.id) || data;
        const lineItems = liData.lineItems || [];
        const pdfSections = secData.sections || [];

        const [{ pdf }, { QuotePDF }] = await Promise.all([
            import("@react-pdf/renderer"),
            import("@/components/quotes/QuotePDF"),
        ]);
        const { createElement } = await import("react");
        const element = createElement(QuotePDF, { quote: fullQuote, lineItems, sections: pdfSections, tenant: tenant! });
        return pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
    }, [data, tenant]);

    const handleDownloadPDF = useCallback(async () => {
        if (!data) return;
        setDownloading(true);
        try {
            const blob = await generatePDFBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    }, [data, generatePDFBlob]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch("/api/quotes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update field");
        }
    }, [data, onUpdate]);

    const handleSendQuote = useCallback(async () => {
        if (!data) return;
        setSending(true);
        try {
            // Generate PDF and convert to base64
            const blob = await generatePDFBlob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((str, byte) => str + String.fromCharCode(byte), "")
            );

            const contactEmail = data.contact?.email || null;
            const contactName = data.contact
                ? `${data.contact.first_name} ${data.contact.last_name}`
                : "";
            const companyName = data.company?.name || "";

            setEmailDefaults({
                to: contactEmail || "",
                subject: `${data.title}${companyName ? ` — ${companyName}` : ""}`,
                body: `<p>Hi${contactName ? ` ${contactName.split(" ")[0]}` : ""},</p><p>Please find the attached quote for your review.</p><p>If you have any questions, feel free to reach out.</p><p>Kind regards</p>`,
                attachments: [{
                    name: `${data.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`,
                    contentType: "application/pdf",
                    contentBytes: base64,
                }],
            });
            setComposeOpen(true);
        } catch (err) {
            console.error("Failed to prepare quote email:", err);
            toast.error("Failed to generate quote PDF");
        } finally {
            setSending(false);
        }
    }, [data, generatePDFBlob]);

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.draft;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "related", label: "Related" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const isDraft = data.status === "draft";

    return (
        <>
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
                </svg>
            }
            iconBg="bg-secondary"
            title={data.title}
            subtitle={null}
            badge={{ label: status.label, dotColor: status.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            actions={
                <>
                    {isDraft && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex rounded-lg h-8 text-sm gap-1.5"
                            onClick={() => setEditOpen(true)}
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Edit Quote
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:inline-flex rounded-lg h-8 text-sm gap-1.5"
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        {downloading ? "Generating..." : "View PDF"}
                    </Button>
                </>
            }
            footer={
                <div className="space-y-2">
                    {/* Mobile-only action row */}
                    <div className="flex gap-2 sm:hidden">
                        {isDraft && (
                            <Button
                                variant="outline"
                                className="flex-1 rounded-lg h-10 text-sm gap-1.5"
                                onClick={() => setEditOpen(true)}
                            >
                                <PencilIcon className="w-4 h-4" />
                                Edit Quote
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="flex-1 rounded-lg h-10 text-sm gap-1.5"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            {downloading ? "Generating..." : "View PDF"}
                        </Button>
                    </div>
                    {/* Send Quote — always visible */}
                    {!hasEmailIntegration && data.status !== "sent" && (
                        <p className="text-xs text-muted-foreground text-center">
                            Connect your Outlook account in Settings to send quotes from the app.
                        </p>
                    )}
                    <Button
                        className="w-full rounded-lg h-11 text-sm gap-2 bg-foreground text-background hover:bg-foreground/90"
                        onClick={handleSendQuote}
                        disabled={sending || data.status === "sent" || !hasEmailIntegration}
                    >
                        <SendIcon className="w-4 h-4" />
                        {sending ? "Preparing..." : data.status === "sent" ? "Quote Sent" : "Send Quote"}
                    </Button>
                </div>
            }
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "Title",
                                    value: data.title,
                                    dbColumn: "title",
                                    type: "text",
                                    rawValue: data.title,
                                },
                                {
                                    label: "Status",
                                    value: status.label,
                                    dbColumn: "status",
                                    type: "select",
                                    rawValue: data.status,
                                    options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
                                },
                                {
                                    label: "Amount",
                                    value: formatCurrency(data.total_amount),
                                    dbColumn: "total_amount",
                                    type: "text",
                                    rawValue: String(data.total_amount),
                                },
                                {
                                    label: "Valid Until",
                                    value: data.valid_until || null,
                                    dbColumn: "valid_until",
                                    type: "text",
                                    rawValue: data.valid_until,
                                },
                                {
                                    label: "Created",
                                    value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                },
                            ]}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
                        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">Scope</p>
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "",
                                    value: data.scope_description || null,
                                    dbColumn: "scope_description",
                                    type: "textarea",
                                    rawValue: data.scope_description,
                                },
                            ]}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
                        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">Description</p>
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "",
                                    value: data.description || null,
                                    dbColumn: "description",
                                    type: "textarea",
                                    rawValue: data.description,
                                },
                            ]}
                        />
                    </div>

                </div>
            )}

            {activeTab === "related" && (
                <RelatedTab data={data} setData={setData} onUpdate={onUpdate} open={open} />
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="quote" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="quote" entityId={data.id} />
            )}
        </SideSheetLayout>

        {editOpen && (
            <Suspense fallback={null}>
                <EditQuoteModal
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    quoteId={data.id}
                    onUpdated={onUpdate}
                />
            </Suspense>
        )}

        {composeOpen && emailDefaults && (
            <Suspense fallback={null}>
                <ComposeEmailModal
                    open={composeOpen}
                    onOpenChange={setComposeOpen}
                    defaultTo={emailDefaults.to}
                    defaultSubject={emailDefaults.subject}
                    defaultBody={emailDefaults.body}
                    defaultAttachments={emailDefaults.attachments}
                    onSent={() => {
                        // Mark quote as sent
                        fetch("/api/quotes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: data.id, status: "sent" }),
                        }).then((res) => {
                            if (res.ok) {
                                setData(prev => prev ? { ...prev, status: "sent" } : prev);
                                onUpdate?.();
                            }
                        });
                    }}
                />
            </Suspense>
        )}
        </>
    );
}

type ContactOption = { id: string; first_name: string; last_name: string; email?: string | null; company_id?: string | null };
type CompanyOption = { id: string; name: string };
type JobOption = { id: string; title: string; reference_id?: string | null; contact?: { first_name: string; last_name: string } | null; service?: { name: string } | null };

function RelatedTab({
    data,
    setData,
    onUpdate,
    open,
}: {
    data: Quote;
    setData: React.Dispatch<React.SetStateAction<Quote | null>>;
    onUpdate?: () => void;
    open: boolean;
}) {
    const { data: contactsData, mutate: mutateContacts } = useContactOptions(open);
    const { data: companiesData, mutate: mutateCompanies } = useCompanyOptions(open);
    const { data: jobsData, mutate: mutateJobs } = useJobOptions(open);

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
        () => (companiesData?.items ?? []).map((c: CompanyOption) => ({
            id: c.id,
            label: c.name,
        })),
        [companiesData]
    );

    const jobOptions: EntityOption[] = useMemo(
        () => (jobsData?.items ?? []).map((j: JobOption) => {
            const contactName = j.contact ? `${j.contact.first_name} ${j.contact.last_name}` : j.title;
            const parts = [j.reference_id, j.service?.name].filter(Boolean);
            return {
                id: j.id,
                label: contactName,
                subtitle: parts.join(" \u00B7 ") || null,
            };
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

            // Auto-set company from contact
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
                />
            </div>
        </div>
    );
}
