"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import { IconFileText as DocumentTextIcon, IconDownload as ArrowDownTrayIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { REPORT_STATUS_CONFIG, REPORT_TYPE_LABELS } from "@/lib/status-config";
import type { ReportTemplate, TemplateSchema } from "@/lib/report-templates/types";

type Report = {
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
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Report | null>(report);
    const [downloading, setDownloading] = useState(false);

    let tenant: ReturnType<typeof useTenant> | null = null;
    try { tenant = useTenant(); } catch { /* no provider */ }

    useEffect(() => { setData(report); }, [report]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleDownloadPDF = useCallback(async () => {
        if (!data || !data.template_id || !tenant) return;
        setDownloading(true);
        try {
            const res = await fetch("/api/report-templates");
            const templatesData = await res.json();
            const tpl = (templatesData.items || []).find((t: ReportTemplate) => t.id === data.template_id);
            if (!tpl) throw new Error("Template not found");

            const schema: TemplateSchema = tpl.schema && tpl.schema.version === 1
                ? tpl.schema : { version: 1, sections: [] };

            const [{ pdf }, { ReportPDF }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("@/components/reports/ReportPDF"),
            ]);
            const { createElement } = await import("react");

            const element = createElement(ReportPDF, {
                report: data,
                template: { name: tpl.name, schema },
                tenant: {
                    company_name: tenant.company_name,
                    name: tenant.name,
                    logo_url: tenant.logo_url,
                    address: tenant.address,
                    phone: tenant.phone,
                    email: tenant.email,
                    abn: tenant.abn,
                    primary_color: tenant.primary_color || "#000000",
                },
            });
            // react-pdf's pdf() has strict DocumentProps typing that clashes with
            // a dynamically-imported component's inferred type; cast through unknown.
            const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();

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
        const supabase = createClient();
        const { error } = await supabase
            .from("reports")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData(prev => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.draft;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
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
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    {data.template_id && (
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full rounded-xl"
                                onClick={() => {
                                    onOpenChange(false);
                                    router.push(`/report/${data.id}`);
                                }}
                            >
                                <DocumentTextIcon className="w-4 h-4 mr-2" />
                                Open Report Form
                            </Button>
                            {data.status === "submitted" && (
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl"
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                    {downloading ? "Generating..." : "View PDF"}
                                </Button>
                            )}
                        </div>
                    )}
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
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {data.company.name[0]}
                                </span>
                            }
                        />
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
    );
}
