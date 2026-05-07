"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { NotesPanel } from "@/components/sheets/NotesPanel";
import { ActivityTimeline } from "@/components/sheets/ActivityTimeline";

import {
    useProfiles,
    useStatusConfig,
    useJobQuotes,
    useJobInvoices,
    useJobReports,
    useJobScheduleEntries,
    useJobCounts,
    useCompanyOptions,
    useContactOptions,
    useJobFiles,
    useJobReceipts,
    useJobPurchaseOrders,
    useJobTimesheets,
} from "@/lib/swr";
import type { EntityOption } from "@/components/ui/entity-search-dropdown";
import { DEFAULT_JOB_STATUSES, toStatusConfig, PAID_STATUS_CONFIG } from "@/lib/status-config";
import {
    IconPlus as PlusIcon,
    IconChevronDown,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { JobTasksPanel } from "@/components/jobs/JobTasksPanel";
import type { ScheduleEntry } from "@/components/schedule/types";

import { JobDetailHeader } from "./JobDetailHeader";
import { JobDetailModals } from "./JobDetailModals";
import { JobDetailsTab } from "./tabs/JobDetailsTab";
import { JobAppointmentsTab } from "./tabs/JobAppointmentsTab";
import { JobQuotesTab } from "./tabs/JobQuotesTab";
import { JobInvoicesTab } from "./tabs/JobInvoicesTab";
import { JobReportsTab } from "./tabs/JobReportsTab";
import { JobExpensesTab } from "./tabs/JobExpensesTab";
import { JobFilesTab } from "./tabs/JobFilesTab";

type Assignee = { id: string; full_name: string | null; email: string | null };

export type JobDetailJob = {
    id: string;
    job_title: string;
    description: string | null;
    reference_id: string | null;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    scheduled_date: string | null;
    project?: { id: string; title: string } | null;
    assignees: Assignee[];
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    created_at: string;
    archived_at?: string | null;
};

interface JobDetailViewProps {
    job: JobDetailJob;
    mode: "inline" | "sheet";
    onUpdate?: () => void;
    onClose?: () => void;
}

const paidStatusConfig = PAID_STATUS_CONFIG;

/** Shared job detail view used by both the inline jobs page and the JobSideSheet. */
export function JobDetailView({ job, mode, onUpdate, onClose }: JobDetailViewProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<JobDetailJob>(job);

    // Modal toggles — owned here so the Create dropdown can fire them
    // independently of which tab is active.
    const [quoteModalOpen, setQuoteModalOpen] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<ScheduleEntry | null>(null);
    const [fileUploadOpen, setFileUploadOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [createMenuMobileOpen, setCreateMenuMobileOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    const { data: statusData } = useStatusConfig("job");
    const statusConfig = toStatusConfig(statusData?.statuses ?? DEFAULT_JOB_STATUSES);

    // Counts always fetch (cheap — Postgres count(*) head-only).
    const { data: countsData } = useJobCounts(data.id);
    // Lists are lazy: only fetched while their tab is active.
    const { data: quotesData } = useJobQuotes(activeTab === "quotes" ? data.id : null);
    const { data: invoicesData } = useJobInvoices(activeTab === "invoices" ? data.id : null);
    const { data: reportsData } = useJobReports(activeTab === "reports" ? data.id : null);
    const { data: appointmentsData } = useJobScheduleEntries(activeTab === "appointments" ? data.id : null);
    const { data: filesData } = useJobFiles(activeTab === "files" ? data.id : null);
    const { data: receiptsData } = useJobReceipts(activeTab === "expenses" ? data.id : null);
    const { data: posData } = useJobPurchaseOrders(activeTab === "expenses" ? data.id : null);
    const { data: timesheetsData } = useJobTimesheets(activeTab === "expenses" ? data.id : null);
    const { data: profilesData } = useProfiles();
    const { data: companiesData, isLoading: companiesLoading, mutate: mutateCompanies } = useCompanyOptions();
    const { data: contactsData, isLoading: contactsLoading, mutate: mutateContacts } = useContactOptions();

    type ContactRow = { id: string; first_name: string; last_name: string; email?: string | null; company_id?: string | null };
    type CompanyRow = { id: string; name: string };

    const companyOptions: EntityOption[] = useMemo(
        () => (companiesData?.items ?? []).map((c: CompanyRow) => ({ id: c.id, label: c.name })),
        [companiesData]
    );

    const contactOptions: EntityOption[] = useMemo(
        () => (contactsData?.items ?? []).map((c: ContactRow) => ({
            id: c.id,
            label: `${c.first_name} ${c.last_name}`,
            subtitle: c.email,
            company_id: c.company_id,
        })),
        [contactsData]
    );

    const users: { value: string; label: string }[] = useMemo(() =>
        (profilesData?.users || []).map((u: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
            value: u.id,
            label: u.user_metadata?.full_name || u.email || u.id,
        })),
        [profilesData]
    );

    useEffect(() => { setData(job); }, [job]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        const res = await fetch("/api/jobs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData((prev) => ({ ...prev, [column]: value }));
            onUpdate?.();
        }
    }, [data.id, onUpdate]);

    const handleContactChange = useCallback(async (id: string, option?: EntityOption) => {
        await handleSave("contact_id", id || null);
        const contact = (contactsData?.items ?? []).find((c: ContactRow) => c.id === id);
        setData((prev) => ({
            ...prev,
            contact: contact ? { id: contact.id, first_name: contact.first_name, last_name: contact.last_name } : null,
        }));
        // Auto-cascade company when the picked contact has one and it differs from the current company.
        if (id && option?.company_id && option.company_id !== data.company?.id) {
            await handleSave("company_id", option.company_id);
            const company = (companiesData?.items ?? []).find((c: CompanyRow) => c.id === option.company_id);
            setData((prev) => ({
                ...prev,
                company: company ? { id: company.id, name: company.name } : prev.company,
            }));
        }
    }, [handleSave, contactsData, companiesData, data.company?.id]);

    const handleCompanyChange = useCallback(async (id: string) => {
        await handleSave("company_id", id || null);
        const company = (companiesData?.items ?? []).find((c: CompanyRow) => c.id === id);
        setData((prev) => ({
            ...prev,
            company: company ? { id: company.id, name: company.name } : null,
        }));
    }, [handleSave, companiesData]);

    const handleArchive = useCallback(async (archived: boolean) => {
        const res = await fetch(`/api/jobs/${data.id}/archive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived }),
        });
        if (!res.ok) return;
        const json = await res.json();
        setData((prev) => ({
            ...prev,
            archived_at: json.item?.archived_at ?? (archived ? new Date().toISOString() : null),
        }));
        onUpdate?.();
    }, [data.id, onUpdate]);

    // Auto-progress a "new" job to "in_progress" when work artefacts are created against it.
    const ensureInProgress = useCallback(async () => {
        if (data.status === "new") {
            await handleSave("status", "in_progress");
        }
    }, [data.status, handleSave]);

    // Tab counts: come from the counts endpoint, regardless of which tab is open.
    // While the active tab's list is loaded, prefer its actual length so the badge
    // stays in sync after an optimistic add/remove the counts endpoint hasn't
    // revalidated yet.
    const labelWithCount = (base: string, count: number | undefined) =>
        count != null ? `${base} (${count})` : base;

    const quotesCount = quotesData?.items?.length ?? countsData?.quotes;
    const invoicesCount = invoicesData?.items?.length ?? countsData?.invoices;
    const reportsCount = reportsData?.items?.length ?? countsData?.reports;
    const appointmentsCount = appointmentsData?.items?.length ?? countsData?.appointments;

    const tabs = [
        { id: "details", label: "Details" },
        { id: "appointments", label: labelWithCount("Appointments", appointmentsCount) },
        { id: "quotes", label: labelWithCount("Quotes", quotesCount) },
        { id: "reports", label: labelWithCount("Reports", reportsCount) },
        { id: "invoices", label: labelWithCount("Invoices", invoicesCount) },
        { id: "expenses", label: "Expenses" },
        { id: "files", label: "Files" },
        // Sheet mode shows Tasks as a tab; inline mode shows Tasks in a right rail instead.
        ...(mode === "sheet" ? [{ id: "tasks", label: "Tasks" }] : []),
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const createOptions: { id: string; label: string; onClick: () => void }[] = [
        { id: "quote", label: "Quote", onClick: () => setQuoteModalOpen(true) },
        { id: "purchase-order", label: "Purchase Order", onClick: () => setPoModalOpen(true) },
        { id: "report", label: "Report", onClick: () => setReportModalOpen(true) },
        { id: "invoice", label: "Invoice", onClick: () => setInvoiceModalOpen(true) },
        {
            id: "appointment",
            label: "Appointment",
            onClick: () => {
                setEditingAppointment(null);
                setAppointmentModalOpen(true);
            },
        },
        { id: "receipt", label: "Receipt", onClick: () => setReceiptModalOpen(true) },
        { id: "timesheet", label: "Timesheet", onClick: () => setTimesheetModalOpen(true) },
    ];

    return (
        <div className="flex flex-col h-full min-h-0 bg-background">
            <JobDetailHeader
                data={data}
                statusConfig={statusConfig}
                mode={mode}
                onClose={onClose}
                onArchive={(archived) => void handleArchive(archived)}
                createOptions={createOptions}
                moreMenuOpen={moreMenuOpen}
                setMoreMenuOpen={setMoreMenuOpen}
                createMenuOpen={createMenuOpen}
                setCreateMenuOpen={setCreateMenuOpen}
            />

            {/* Tabs */}
            <div className="px-6 border-b border-border/50 bg-background shrink-0">
                <div className="flex gap-6 -mb-px pt-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "pb-3 text-[17px] font-medium transition-colors relative focus:outline-none whitespace-nowrap",
                                activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab body + optional right rail */}
            <div className="flex-1 flex min-h-0 bg-secondary/20">
                <div className="flex-1 overflow-y-auto p-6 min-w-0">
                    {activeTab === "details" && (
                        <JobDetailsTab
                            data={data}
                            setData={setData}
                            handleSave={handleSave}
                            handleContactChange={handleContactChange}
                            handleCompanyChange={handleCompanyChange}
                            contactOptions={contactOptions}
                            companyOptions={companyOptions}
                            contactsLoading={contactsLoading}
                            companiesLoading={companiesLoading}
                            onContactCreated={() => mutateContacts()}
                            onCompanyCreated={() => mutateCompanies()}
                            statusConfig={statusConfig}
                            paidStatusConfig={paidStatusConfig}
                            users={users}
                            onUpdate={onUpdate}
                        />
                    )}
                    {activeTab === "appointments" && (
                        <JobAppointmentsTab
                            appointments={(appointmentsData?.items as ScheduleEntry[]) || []}
                            onOpenAppointment={(entry) => {
                                setEditingAppointment(entry);
                                setAppointmentModalOpen(true);
                            }}
                        />
                    )}
                    {activeTab === "quotes" && (
                        <JobQuotesTab
                            jobId={data.id}
                            quotes={quotesData?.items || []}
                            onOpenCreate={() => setQuoteModalOpen(true)}
                        />
                    )}
                    {activeTab === "invoices" && (
                        <JobInvoicesTab
                            jobId={data.id}
                            invoices={invoicesData?.items || []}
                            onOpenCreate={() => setInvoiceModalOpen(true)}
                        />
                    )}
                    {activeTab === "reports" && (
                        <JobReportsTab
                            jobId={data.id}
                            reports={reportsData?.items || []}
                            onOpenCreate={() => setReportModalOpen(true)}
                        />
                    )}
                    {activeTab === "expenses" && (
                        <JobExpensesTab
                            jobId={data.id}
                            purchaseOrders={posData?.items || []}
                            receipts={receiptsData?.items || []}
                            timesheets={timesheetsData?.items || []}
                            onOpenCreatePO={() => setPoModalOpen(true)}
                            onOpenCreateReceipt={() => setReceiptModalOpen(true)}
                            onOpenCreateTimesheet={() => setTimesheetModalOpen(true)}
                        />
                    )}
                    {activeTab === "files" && (
                        <JobFilesTab
                            jobId={data.id}
                            files={filesData?.items || []}
                            onOpenUpload={() => setFileUploadOpen(true)}
                        />
                    )}
                    {activeTab === "tasks" && mode === "sheet" && (
                        <JobTasksPanel jobId={data.id} variant="tab" />
                    )}
                    {activeTab === "notes" && (
                        <NotesPanel entityType="job" entityId={data.id} />
                    )}
                    {activeTab === "activity" && (
                        <ActivityTimeline entityType="job" entityId={data.id} />
                    )}
                </div>
                {mode === "inline" && (
                    <aside className="hidden lg:flex w-[420px] xl:w-[460px] shrink-0 min-h-0">
                        <JobTasksPanel jobId={data.id} variant="rail" />
                    </aside>
                )}
            </div>

            {/* Mobile sticky Create bar */}
            <div className="md:hidden shrink-0 px-3 py-3 border-t border-border bg-background">
                <Popover open={createMenuMobileOpen} onOpenChange={setCreateMenuMobileOpen}>
                    <PopoverTrigger asChild>
                        <Button size="lg" className="w-full">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create
                            <IconChevronDown className="w-4 h-4 ml-2 -mr-1" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" side="top" sideOffset={6} className="p-1">
                        {createOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setCreateMenuMobileOpen(false);
                                    opt.onClick();
                                }}
                                className="w-full flex items-center rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-secondary text-foreground"
                            >
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>

            <JobDetailModals
                jobId={data.id}
                companyId={data.company?.id}
                quoteModalOpen={quoteModalOpen}
                setQuoteModalOpen={setQuoteModalOpen}
                invoiceModalOpen={invoiceModalOpen}
                setInvoiceModalOpen={setInvoiceModalOpen}
                reportModalOpen={reportModalOpen}
                setReportModalOpen={setReportModalOpen}
                appointmentModalOpen={appointmentModalOpen}
                setAppointmentModalOpen={setAppointmentModalOpen}
                editingAppointment={editingAppointment}
                setEditingAppointment={setEditingAppointment}
                fileUploadOpen={fileUploadOpen}
                setFileUploadOpen={setFileUploadOpen}
                receiptModalOpen={receiptModalOpen}
                setReceiptModalOpen={setReceiptModalOpen}
                poModalOpen={poModalOpen}
                setPoModalOpen={setPoModalOpen}
                timesheetModalOpen={timesheetModalOpen}
                setTimesheetModalOpen={setTimesheetModalOpen}
                onArtefactCreated={() => void ensureInProgress()}
            />
        </div>
    );
}
