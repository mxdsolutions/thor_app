"use client";

import { useState, useEffect, useCallback } from "react";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { createClient } from "@/lib/supabase/client";

type Report = {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    created_at: string;
    data: Record<string, unknown>;
    job?: { id: string; description: string } | null;
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

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-gray-400" },
    in_progress: { label: "In Progress", color: "bg-blue-500" },
    complete: { label: "Complete", color: "bg-emerald-500" },
    submitted: { label: "Submitted", color: "bg-purple-500" },
};

const TYPE_LABELS: Record<string, string> = {
    assessment: "Assessment",
    defect: "Defect",
    inspection: "Inspection",
    make_safe: "Make Safe",
    specialist: "Specialist",
    variation: "Variation",
    roof: "Roof",
    other: "Other",
};

export function ReportSideSheet({ report, open, onOpenChange, onUpdate }: ReportSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Report | null>(report);

    useEffect(() => { setData(report); }, [report]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

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
                            title={data.job.description}
                            icon={
                                <span className="text-[10px] font-bold text-muted-foreground">J</span>
                            }
                        />
                    )}

                    {data.project && (
                        <LinkedEntityCard
                            label="Project"
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
