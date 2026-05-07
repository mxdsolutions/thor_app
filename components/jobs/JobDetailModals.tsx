"use client";

import { mutate } from "swr";
import { CreateQuoteModal } from "@/components/modals/CreateQuoteModal";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { CreateReportModal } from "@/components/modals/CreateReportModal";
import { ScheduleEntryModal } from "@/components/modals/ScheduleEntryModal";
import { FileUploadModal } from "@/components/modals/FileUploadModal";
import { CreateReceiptModal } from "@/components/modals/CreateReceiptModal";
import { CreatePurchaseOrderModal } from "@/components/modals/CreatePurchaseOrderModal";
import { CreateTimesheetModal } from "@/components/modals/CreateTimesheetModal";
import type { ScheduleEntry } from "@/components/schedule/types";

interface JobDetailModalsProps {
    jobId: string;
    companyId?: string;
    quoteModalOpen: boolean;
    setQuoteModalOpen: (open: boolean) => void;
    invoiceModalOpen: boolean;
    setInvoiceModalOpen: (open: boolean) => void;
    reportModalOpen: boolean;
    setReportModalOpen: (open: boolean) => void;
    appointmentModalOpen: boolean;
    setAppointmentModalOpen: (open: boolean) => void;
    editingAppointment: ScheduleEntry | null;
    setEditingAppointment: (entry: ScheduleEntry | null) => void;
    fileUploadOpen: boolean;
    setFileUploadOpen: (open: boolean) => void;
    receiptModalOpen: boolean;
    setReceiptModalOpen: (open: boolean) => void;
    poModalOpen: boolean;
    setPoModalOpen: (open: boolean) => void;
    timesheetModalOpen: boolean;
    setTimesheetModalOpen: (open: boolean) => void;
    /** Auto-progresses a "new" job to "in_progress" when a child artefact is created. */
    onArtefactCreated: () => void;
}

export function JobDetailModals({
    jobId,
    companyId,
    quoteModalOpen,
    setQuoteModalOpen,
    invoiceModalOpen,
    setInvoiceModalOpen,
    reportModalOpen,
    setReportModalOpen,
    appointmentModalOpen,
    setAppointmentModalOpen,
    editingAppointment,
    setEditingAppointment,
    fileUploadOpen,
    setFileUploadOpen,
    receiptModalOpen,
    setReceiptModalOpen,
    poModalOpen,
    setPoModalOpen,
    timesheetModalOpen,
    setTimesheetModalOpen,
    onArtefactCreated,
}: JobDetailModalsProps) {
    return (
        <>
            <CreateQuoteModal
                open={quoteModalOpen}
                onOpenChange={setQuoteModalOpen}
                defaultValues={{ jobId, companyId }}
                onCreated={() => {
                    mutate(`/api/quotes?job_id=${jobId}`);
                    mutate(`/api/jobs/${jobId}/counts`);
                    onArtefactCreated();
                }}
            />
            <CreateInvoiceModal
                open={invoiceModalOpen}
                onOpenChange={setInvoiceModalOpen}
                defaultValues={{ job_id: jobId, company_id: companyId }}
                onCreated={() => {
                    mutate(`/api/invoices?job_id=${jobId}`);
                    mutate(`/api/jobs/${jobId}/counts`);
                    onArtefactCreated();
                }}
            />
            <CreateReportModal
                open={reportModalOpen}
                onOpenChange={setReportModalOpen}
                defaultValues={{ job_id: jobId, company_id: companyId }}
                onCreated={() => {
                    mutate(`/api/reports?job_id=${jobId}`);
                    mutate(`/api/jobs/${jobId}/counts`);
                    onArtefactCreated();
                }}
            />
            <ScheduleEntryModal
                open={appointmentModalOpen}
                onOpenChange={(open) => {
                    setAppointmentModalOpen(open);
                    if (!open) setEditingAppointment(null);
                }}
                entry={editingAppointment}
                defaultJobId={jobId}
                onSaved={() => {
                    mutate(`/api/schedule?job_id=${jobId}`);
                    mutate(`/api/jobs/${jobId}/counts`);
                }}
            />
            <FileUploadModal
                open={fileUploadOpen}
                onOpenChange={setFileUploadOpen}
                jobId={jobId}
                onUploaded={() => mutate(`/api/files?job_id=${jobId}`)}
            />
            <CreateReceiptModal
                open={receiptModalOpen}
                onOpenChange={setReceiptModalOpen}
                jobId={jobId}
                onCreated={() => {
                    mutate(`/api/receipts?job_id=${jobId}`);
                    mutate(`/api/files?job_id=${jobId}`);
                }}
            />
            <CreatePurchaseOrderModal
                open={poModalOpen}
                onOpenChange={setPoModalOpen}
                jobId={jobId}
                onCreated={() => mutate(`/api/purchase-orders?job_id=${jobId}`)}
            />
            <CreateTimesheetModal
                open={timesheetModalOpen}
                onOpenChange={setTimesheetModalOpen}
                defaultJobId={jobId}
                onCreated={() => {
                    mutate(`/api/timesheets?job_id=${jobId}`);
                    onArtefactCreated();
                }}
            />
        </>
    );
}
