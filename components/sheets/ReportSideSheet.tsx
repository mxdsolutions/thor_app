"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { FormSection } from "@/components/reports/FormSection";
import { createClient } from "@/lib/supabase/client";
import { useTenantOptional } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    FileText as DocumentTextIcon,
    Download as ArrowDownTrayIcon,
    Send as SendIcon,
    MoreVertical,
    Archive,
    ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { REPORT_STATUS_CONFIG, REPORT_TYPE_LABELS } from "@/lib/status-config";
import type { ReportTemplate, TemplateSchema } from "@/lib/report-templates/types";
import { useArchiveAction } from "./use-archive-action";
import { SendReportFormModal } from "@/components/modals/SendReportFormModal";

const noop = () => {};

export type Report = {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    created_at: string;
    data: Record<string, unknown>;
    template_id?: string | null;
    job?: { id: string; job_title: string; description?: string | null } | null;
    project?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    creator?: { id: string; full_name: string } | null;
    archived_at?: string | null;
};

interface ReportSideSheetProps {
    report: Report | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

const statusConfig = REPORT_STATUS_CONFIG;
const TYPE_LABELS = REPORT_TYPE_LABELS;

export function ReportSideSheet({ report, open, onOpenChange, onUpdate }: ReportSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Report | null>(report);
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [template, setTemplate] = useState<ReportTemplate | null>(null);
    const [freshData, setFreshData] = useState<Record<string, unknown> | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string>("");
    const [menuOpen, setMenuOpen] = useState(false);

    const tenant = useTenantOptional();

    useEffect(() => { setData(report); }, [report]);
    useEffect(() => {
        if (data?.id) {
            setActiveTab("details");
            setTemplate(null);
            setFreshData(null);
            setActiveSectionId("");
        }
    }, [data?.id]);

    // Lazy-load the template + freshest data when the Data tab is opened
    useEffect(() => {
        if (activeTab !== "data" || !data?.id || !data.template_id) return;
        if (template && freshData !== null) return;

        let cancelled = false;
        setLoadingData(true);
        (async () => {
            try {
                const supabase = createClient();
                const [tplRes, rowRes] = await Promise.all([
                    fetch("/api/report-templates").then((r) => r.json()),
                    supabase.from("reports").select("data").eq("id", data.id).single(),
                ]);
                if (cancelled) return;
                const tpl = (tplRes.items || []).find((t: ReportTemplate) => t.id === data.template_id);
                if (tpl) setTemplate(tpl);
                setFreshData(
                    (rowRes.data?.data && typeof rowRes.data.data === "object"
                        ? (rowRes.data.data as Record<string, unknown>)
                        : {})
                );
            } finally {
                if (!cancelled) setLoadingData(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab, data?.id, data?.template_id, template, freshData]);

    const schema: TemplateSchema | null = useMemo(() => {
        if (!template?.schema || template.schema.version !== 1) return null;
        return template.schema;
    }, [template]);

    // Default the active sub-tab to the first section once schema loads
    useEffect(() => {
        if (!activeSectionId && schema?.sections.length) {
            setActiveSectionId(schema.sections[0].id);
        }
    }, [schema, activeSectionId]);

    const activeSection = useMemo(
        () => schema?.sections.find((s) => s.id === activeSectionId) ?? null,
        [schema, activeSectionId]
    );

    const handleDownloadPDF = useCallback(async () => {
        if (!data || !data.template_id || !tenant) return;
        setDownloading(true);
        try {
            // Fetch the freshest report row directly — the SWR list can lag
            // behind the most recent save, which left the PDF with empty data.
            const supabase = createClient();
            const [{ data: fresh, error: freshError }, { data: freshTenant }] = await Promise.all([
                supabase
                    .from("reports")
                    .select("*, job:jobs(id, job_title, description), company:companies(id, name), creator:profiles!reports_created_by_fkey(id, full_name)")
                    .eq("id", data.id)
                    .single(),
                // Also read the tenant row fresh so a just-uploaded cover doesn't
                // get missed because the React context is still holding stale data.
                supabase
                    .from("tenants")
                    .select("report_cover_url")
                    .eq("id", tenant.id)
                    .single(),
            ]);
            if (freshError || !fresh) throw new Error("Failed to load report");

            const res = await fetch("/api/report-templates");
            const templatesData = await res.json();
            const tpl = (templatesData.items || []).find((t: ReportTemplate) => t.id === data.template_id);
            if (!tpl) throw new Error("Template not found");

            const schema: TemplateSchema = tpl.schema && tpl.schema.version === 1
                ? tpl.schema : { version: 1, sections: [] };

            // Prefer the freshly-fetched cover URL over the React context value
            // — the context is only refreshed on server re-render, so uploads
            // in the current session would otherwise appear missing.
            const coverUrl = freshTenant?.report_cover_url ?? tenant.report_cover_url ?? null;
            const coverIsPdf = coverUrl
                ? coverUrl.split("?")[0].toLowerCase().endsWith(".pdf")
                : false;

            const [{ pdf }, { ReportPDF }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("@/components/reports/ReportPDF"),
            ]);
            const { createElement } = await import("react");

            const element = createElement(ReportPDF, {
                report: {
                    ...fresh,
                    data: (fresh.data && typeof fresh.data === "object") ? fresh.data : {},
                } as Parameters<typeof ReportPDF>[0]["report"],
                template: { name: tpl.name, schema },
                tenant: {
                    company_name: tenant.company_name,
                    name: tenant.name,
                    logo_url: tenant.logo_url,
                    // Only pass image covers through to react-pdf; PDF covers are
                    // merged separately below.
                    report_cover_url: coverIsPdf ? null : coverUrl,
                    address: tenant.address,
                    phone: tenant.phone,
                    email: tenant.email,
                    abn: tenant.abn,
                    primary_color: tenant.primary_color || "#000000",
                },
                skipCover: coverIsPdf,
            });
            // react-pdf's pdf() has strict DocumentProps typing that clashes with
            // a dynamically-imported component's inferred type; cast through unknown.
            let blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();

            // If the tenant's cover is a PDF, prepend its pages to the content PDF.
            if (coverIsPdf && coverUrl) {
                try {
                    const [{ PDFDocument }, contentBytes, coverRes] = await Promise.all([
                        import("pdf-lib"),
                        blob.arrayBuffer(),
                        fetch(coverUrl),
                    ]);
                    if (!coverRes.ok) throw new Error("Failed to fetch cover PDF");
                    const coverBytes = await coverRes.arrayBuffer();

                    const merged = await PDFDocument.create();
                    const coverDoc = await PDFDocument.load(coverBytes);
                    const contentDoc = await PDFDocument.load(contentBytes);

                    const coverPages = await merged.copyPages(coverDoc, coverDoc.getPageIndices());
                    coverPages.forEach((p) => merged.addPage(p));
                    const contentPages = await merged.copyPages(contentDoc, contentDoc.getPageIndices());
                    contentPages.forEach((p) => merged.addPage(p));

                    const mergedBytes = await merged.save();
                    blob = new Blob([mergedBytes as unknown as BlobPart], { type: "application/pdf" });
                } catch (err) {
                    console.error("Failed to merge PDF cover", err);
                    toast.warning("Couldn't prepend PDF cover — opened report without it");
                }
            }

            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch {
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    }, [data, tenant]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch("/api/reports", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const archive = useArchiveAction({
        entityName: "report",
        endpoint: data ? `/api/reports/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.draft;
    const tabs = [
        { id: "details", label: "Details" },
        ...(data.template_id ? [{ id: "data", label: "Data" }] : []),
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    // Primary action stays in the header on desktop; secondary form actions
    // collapse into the kebab so the header doesn't feel cramped. Mobile keeps
    // the full button stack in the footer where vertical space is cheap.
    const primaryButton = data.template_id && data.status === "submitted" ? (
        <Button
            size="sm"
            className="rounded-lg"
            onClick={handleDownloadPDF}
            disabled={downloading}
        >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            {downloading ? "Generating..." : "View PDF"}
        </Button>
    ) : null;

    const mobileActionButtons = data.template_id ? (
        <>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
                <a href={`/report/${data.id}`} target="_blank" rel="noopener noreferrer">
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    Open Form
                </a>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setSendModalOpen(true)}
            >
                <SendIcon className="w-4 h-4 mr-2" />
                Send Form
            </Button>
            {data.status === "submitted" && (
                <Button
                    size="sm"
                    className="rounded-lg"
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    {downloading ? "Generating..." : "View PDF"}
                </Button>
            )}
        </>
    ) : null;

    const isArchived = !!data.archived_at;
    const kebabItemCls =
        "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary text-foreground transition-colors";
    const headerMenu = (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-9 w-9 px-0"
                    aria-label="More actions"
                >
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1">
                {data.template_id && (
                    <>
                        <a
                            href={`/report/${data.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMenuOpen(false)}
                            className={kebabItemCls}
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            Open Form
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                setSendModalOpen(true);
                            }}
                            className={kebabItemCls}
                        >
                            <SendIcon className="w-4 h-4" />
                            Send Form
                        </button>
                        <div className="my-1 h-px bg-border" />
                    </>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setMenuOpen(false);
                        void archive.toggle(!isArchived);
                    }}
                    className={kebabItemCls}
                >
                    {isArchived ? (
                        <>
                            <ArchiveRestore className="w-4 h-4" />
                            Restore report
                        </>
                    ) : (
                        <>
                            <Archive className="w-4 h-4" />
                            Archive report
                        </>
                    )}
                </button>
            </PopoverContent>
        </Popover>
    );

    return (
        <>
        <SendReportFormModal
            open={sendModalOpen}
            onOpenChange={setSendModalOpen}
            reportId={data.id}
        />
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            }
            iconBg="bg-orange-500/10"
            title={data.title}
            subtitle={TYPE_LABELS[data.type] || data.type}
            badge={{ label: status.label, dotColor: status.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            banner={archive.banner}
            actions={
                <div className="flex items-center gap-2.5">
                    {primaryButton && (
                        <div className="hidden md:flex items-center">{primaryButton}</div>
                    )}
                    {headerMenu}
                </div>
            }
            footer={
                mobileActionButtons ? (
                    <div className="flex flex-col gap-2 [&>*]:w-full">{mobileActionButtons}</div>
                ) : undefined
            }
            footerClassName="md:hidden"
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
                                    label: "Type",
                                    value: TYPE_LABELS[data.type] || data.type,
                                    dbColumn: "type",
                                    type: "select",
                                    rawValue: data.type,
                                    options: Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
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
                                    label: "Created By",
                                    value: data.creator?.full_name || null,
                                },
                                {
                                    label: "Created",
                                    value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                },
                            ]}
                        />
                    </div>

                    {data.notes && (
                        <div className="rounded-xl border border-border bg-card p-5">
                            <DetailFields
                                onSave={handleSave}
                                fields={[
                                    {
                                        label: "Notes",
                                        value: data.notes,
                                        dbColumn: "notes",
                                        type: "text",
                                        rawValue: data.notes,
                                    },
                                ]}
                            />
                        </div>
                    )}

                    {data.job && (
                        <LinkedEntityCard
                            label="Job"
                            title={data.job.job_title}
                            entityType="job"
                            entityId={data.job.id}
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">J</span>
                            }
                        />
                    )}

                    {data.project && (
                        <LinkedEntityCard
                            label="Scope"
                            title={data.project.title}
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">P</span>
                            }
                        />
                    )}

                    {data.company && (
                        <LinkedEntityCard
                            label="Company"
                            title={data.company.name}
                            entityType="company"
                            entityId={data.company.id}
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {data.company.name[0]}
                                </span>
                            }
                        />
                    )}
                </div>
            )}

            {activeTab === "data" && (
                <div className="space-y-4">
                    {loadingData && !schema && (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                            Loading report data…
                        </div>
                    )}

                    {!loadingData && schema && schema.sections.length === 0 && (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                            This template has no sections.
                        </div>
                    )}

                    {schema && schema.sections.length > 0 && (
                        <>
                            {/* Section sub-tabs — horizontal scrollable pills */}
                            <div className="-mx-2 overflow-x-auto">
                                <div className="flex gap-1.5 px-2 pb-1 min-w-max">
                                    {schema.sections.map((section, i) => (
                                        <button
                                            key={`${section.id}-${i}`}
                                            type="button"
                                            onClick={() => setActiveSectionId(section.id)}
                                            className={cn(
                                                "shrink-0 px-3 h-8 rounded-lg text-xs font-medium transition-colors",
                                                activeSectionId === section.id
                                                    ? "bg-foreground text-background"
                                                    : "bg-secondary text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {section.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active section only — keeps photo-heavy sections lazy */}
                            {activeSection && (
                                <FormSection
                                    key={activeSection.id}
                                    section={activeSection}
                                    data={
                                        (freshData?.[activeSection.id] as
                                            | Record<string, unknown>
                                            | Record<string, unknown>[]) ??
                                        (activeSection.type === "repeater" ? [] : {})
                                    }
                                    onChange={noop}
                                    readOnly
                                    reportId={data.id}
                                    tenantId={tenant?.id}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="report" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="report" entityId={data.id} />
            )}
        </SideSheetLayout>
        </>
    );
}
