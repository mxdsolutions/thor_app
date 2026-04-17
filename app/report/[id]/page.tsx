"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { ReportWizardShell } from "@/components/reports/wizard/ReportWizardShell";
import { ROUTES } from "@/lib/routes";
import { IconArrowLeft as ArrowLeftIcon } from "@tabler/icons-react";
import type { TemplateSchema, ReportTemplate } from "@/lib/report-templates/types";
import { buildAutoPopulatedData, type JobContext } from "@/lib/report-templates/auto-populate";

type Report = {
    id: string;
    title: string;
    type: string;
    status: string;
    template_id: string | null;
    job_id: string | null;
    job: JobContext | null;
    data: Record<string, unknown>;
};

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tenant = useTenant();
    const [report, setReport] = useState<Report | null>(null);
    const [template, setTemplate] = useState<ReportTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReport = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("reports")
                .select("id, title, type, status, template_id, data, job_id, job:jobs(id, job_title, description, status, amount, scheduled_date, contact:contacts(id, first_name, last_name, email, phone, address, postcode))")
                .eq("id", id)
                .single();

            if (data) {
                setReport(data as unknown as Report);
                if (data.template_id) {
                    const res = await fetch("/api/report-templates");
                    const templatesData = await res.json();
                    const tpl = (templatesData.items || []).find((t: ReportTemplate) => t.id === data.template_id);
                    if (tpl) setTemplate(tpl);
                }
            }
            setLoading(false);
        };
        loadReport();
    }, [id]);

    const handleSave = useCallback(async (data: Record<string, unknown>) => {
        const res = await fetch("/api/reports", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, data }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setReport((prev) => prev ? { ...prev, data } : prev);
    }, [id]);

    const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
        const res = await fetch("/api/reports", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, data, status: "submitted" }),
        });
        if (!res.ok) throw new Error("Failed to submit");
        setReport((prev) => prev ? { ...prev, data, status: "submitted" } : prev);
    }, [id]);

    const initialData = useMemo(() => {
        if (!report || !template?.schema) return report?.data || {};
        if (!report.job) return report.data || {};
        return buildAutoPopulatedData(template.schema, report.job, report.data || {});
    }, [report, template]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading report...</p>
            </div>
        );
    }

    if (!report || !template) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground">
                    {!report ? "Report not found." : "This report has no template attached."}
                </p>
                <Link
                    href={ROUTES.OPS_REPORTS}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Reports
                </Link>
            </div>
        );
    }

    const schema: TemplateSchema = template.schema && template.schema.version === 1
        ? template.schema
        : { version: 1, sections: [] };

    if (schema.sections.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground">This template has no sections.</p>
                <Link
                    href={ROUTES.OPS_REPORTS}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Reports
                </Link>
            </div>
        );
    }

    return (
        <ReportWizardShell
            reportId={report.id}
            reportTitle={report.title}
            reportStatus={report.status}
            schema={schema}
            initialData={initialData}
            tenantId={tenant.id}
            onSave={handleSave}
            onSubmit={handleSubmit}
        />
    );
}
