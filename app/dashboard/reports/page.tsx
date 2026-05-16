"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { usePermissionOptional } from "@/lib/tenant-context";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { JobSearchSelect } from "@/components/ui/job-search-select";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { useCreateDeepLink } from "@/lib/hooks/use-create-deep-link";
import { REPORT_STATUS_CONFIG } from "@/lib/status-config";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
    reportStatusDotClass,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, timeAgo } from "@/lib/utils";
import { Search as MagnifyingGlassIcon, Plus as PlusIcon, ArrowUpRight as ArrowUpRightIcon, Settings as SettingsIcon } from "lucide-react";
import { useReports, type ArchiveScope } from "@/lib/swr";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { CreateReportModal } from "@/components/modals/CreateReportModal";
import { ReportSideSheet } from "@/components/sheets/ReportSideSheet";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

type Report = {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    data: Record<string, unknown>;
    created_at: string;
    job?: { id: string; job_title: string; description?: string | null } | null;
    project?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    creator?: { id: string; full_name: string } | null;
};

const REPORT_TYPES = [
    "All", "assessment", "defect", "inspection", "make_safe",
    "specialist", "variation", "roof", "other",
];

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
    usePageTitle("Reports");
    const searchParams = useSearchParams();
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [jobFilter, setJobFilter] = useState<string>("");
    const [createOpen, setCreateOpen] = useState(false);
    useCreateDeepLink(() => setCreateOpen(true));
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const canWriteReports = usePermissionOptional("ops.reports", "write", true);
    useMobileHeaderAction(useCallback(() => {
        if (canWriteReports) setCreateOpen(true);
    }, [canWriteReports]));

    const { data, isLoading, mutate } = useReports(archiveScope);
    const allReports: Report[] = useMemo(() => data?.items || [], [data]);

    // Auto-open side sheet from ?report=<id> query param, then strip the param so
    // closing the sheet doesn't re-trigger the effect and re-open it.
    useEffect(() => {
        const reportId = searchParams.get("report");
        if (reportId && allReports.length > 0 && !selectedReport) {
            const found = allReports.find((r) => r.id === reportId);
            if (found) {
                setSelectedReport(found);
                router.replace(ROUTES.OPS_REPORTS, { scroll: false });
            }
        }
    }, [searchParams, allReports, selectedReport, router]);

    const reports = allReports.filter(r => {
        const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "All" || r.type === typeFilter;
        const matchesStatus = statusFilter === "All" || r.status === statusFilter;
        const matchesJob = !jobFilter || r.job?.id === jobFilter;
        return matchesSearch && matchesType && matchesStatus && matchesJob;
    });

    return (
    <>
        <ScrollableTableLayout
            header={
                <div className="space-y-4">
                    <div className="px-4 md:px-6 lg:px-10">
                        <h1 className="font-statement text-2xl font-extrabold tracking-tight">Reports</h1>
                    </div>
                    <DashboardControls>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search reports..."
                                className="pl-9 rounded-xl border-border/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <MobileFilters>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[140px]">
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
                            <ArchiveScopedStatusSelect
                                archive={archiveScope}
                                onArchiveChange={setArchiveScope}
                                status={statusFilter}
                                onStatusChange={setStatusFilter}
                                statuses={Object.entries(REPORT_STATUS_CONFIG).map(([key, v]) => ({ id: key, label: v.label }))}
                            />
                            <JobSearchSelect
                                value={jobFilter}
                                onChange={setJobFilter}
                                placeholder="Filter by job..."
                                className="w-full md:w-[220px]"
                            />
                        </MobileFilters>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Subordinate outline button → template-management surface
                            in Settings → Reports → Templates. Discoverability
                            shortcut for users thinking "I need a different template"
                            while looking at their reports. */}
                        <Button asChild variant="outline" className="hidden md:inline-flex">
                            <Link href={ROUTES.SETTINGS_REPORT_TEMPLATES}>
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Manage templates
                            </Link>
                        </Button>
                        {canWriteReports && (
                            <Button className="px-6 hidden md:inline-flex" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                New Report
                            </Button>
                        )}
                    </div>
                </DashboardControls>
                </div>
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
                                    <span className="font-semibold">{report.title}</span>
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50">
                                        {TYPE_LABELS[report.type] || report.type}
                                    </Badge>
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", reportStatusDotClass[report.status] || "bg-gray-400")} />
                                        <span className="font-medium text-muted-foreground capitalize">
                                            {report.status.replace("_", " ")}
                                        </span>
                                    </div>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                    {report.job ? (
                                        <EntityPreviewCard entityType="job" entityId={report.job.id}>
                                            <span>{report.job.job_title}</span>
                                        </EntityPreviewCard>
                                    ) : report.company ? (
                                        <EntityPreviewCard entityType="company" entityId={report.company.id}>
                                            <span>{report.company.name}</span>
                                        </EntityPreviewCard>
                                    ) : report.project?.title || "—"}
                                </td>
                                <td className={tableCellMuted + " px-4 hidden md:table-cell"}>
                                    {report.creator ? (
                                        <EntityPreviewCard entityType="user" entityId={report.creator.id}>
                                            <span>{report.creator.full_name}</span>
                                        </EntityPreviewCard>
                                    ) : "—"}
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
            onCreated={() => { mutate(); }}
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
