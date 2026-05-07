"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import { ReportSideSheet, type Report } from "@/components/sheets/ReportSideSheet";

interface Props {
    jobId: string;
    reports: Report[];
    onOpenCreate: () => void;
}

export function JobReportsTab({ jobId, reports, onOpenCreate }: Props) {
    const [selected, setSelected] = useState<Report | null>(null);

    return (
        <div className="space-y-2 px-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-semibold text-foreground">Reports</p>
                <Button size="sm" onClick={onOpenCreate}>
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    New Report
                </Button>
            </div>
            {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No reports yet</p>
            ) : reports.map((r) => (
                <div key={r.id} onClick={() => setSelected(r)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div>
                        <p className="font-medium">{r.title || "Untitled Report"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.type?.replace(/_/g, " ") || "Report"} · {r.status}</p>
                    </div>
                </div>
            ))}
            <ReportSideSheet
                report={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate(`/api/reports?job_id=${jobId}`)}
            />
        </div>
    );
}
