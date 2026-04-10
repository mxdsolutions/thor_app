"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, timeAgo } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
import { useReports } from "@/lib/swr";
import { CreateReportModal } from "@/components/modals/CreateReportModal";
import { ReportSideSheet } from "@/components/sheets/ReportSideSheet";

type Report = {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    data: Record<string, unknown>;
    created_at: string;
    job?: { id: string; description: string } | null;
    project?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    creator?: { id: string; full_name: string } | null;
};

const REPORT_TYPES = [
    "All", "assessment", "defect", "inspection", "make_safe",
    "specialist", "variation", "roof", "other",
];

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-400",
    in_progress: "bg-blue-500",
    complete: "bg-emerald-500",
    submitted: "bg-purple-500",
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

export default function ReportsPage() {
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const { data, isLoading, mutate } = useReports();
    const allReports: Report[] = data?.items || [];

    // Auto-open side sheet from ?report=<id> query param
    useEffect(() => {
        const reportId = searchParams.get("report");
        if (reportId && allReports.length > 0 && !selectedReport) {
            const found = allReports.find((r) => r.id === reportId);
            if (found) setSelectedReport(found);
        }
    }, [searchParams, allReports, selectedReport]);

    const reports = allReports.filter(r => {
        const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "All" || r.type === typeFilter;
        return matchesSearch && matchesType;
    });

    usePageTitle("Reports");

    return (
    <>
        <ScrollableTableLayout
            header={
                <DashboardControls>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 min-w-[320px] max-w-xl">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search reports..."
                                className="pl-9 rounded-xl border-border/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] rounded-xl border-border/50 h-10">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REPORT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t === "All" ? "All Types" : TYPE_LABELS[t] || t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button className="rounded-full px-6 shrink-0" onClick={() => setCreateOpen(true)}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Report
                    </Button>
                </DashboardControls>
            }
        >
            {isLoading ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Loading reports...</div>
            ) : (
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                            <th className={tableHeadCell + " px-4"}>Type</th>
                            <th className={tableHeadCell + " px-4"}>Status</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Job</th>
                            <th className={tableHeadCell + " px-4 hidden md:table-cell"}>Created By</th>
                            <th className={tableHeadCell + " px-4 hidden md:table-cell"}>Created</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedReport(report)}>
                                <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                    <span className="font-semibold text-sm">{report.title}</span>
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50">
                                        {TYPE_LABELS[report.type] || report.type}
                                    </Badge>
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[report.status] || "bg-gray-400")} />
                                        <span className="text-xs font-medium text-muted-foreground capitalize">
                                            {report.status.replace("_", " ")}
                                        </span>
                                    </div>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                    {report.job?.description || report.project?.title || report.company?.name || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                    {report.creator?.full_name || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                    {timeAgo(report.created_at)}
                                </td>
                                <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                    <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                        <ArrowUpRightIcon className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                                    {allReports.length === 0 ? "No reports yet. Create your first report." : "No reports match your filters."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </ScrollableTableLayout>

        <CreateReportModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={async (item) => {
                const result = await mutate();
                const found = (result?.items || []).find((r: Report) => r.id === item.id);
                setSelectedReport(found || null);
            }}
        />

        <ReportSideSheet
            report={selectedReport}
            open={!!selectedReport}
            onOpenChange={(open) => { if (!open) setSelectedReport(null); }}
            onUpdate={() => mutate()}
        />
    </>
    );
}
