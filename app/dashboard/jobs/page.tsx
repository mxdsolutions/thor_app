"use client";

import { Suspense, useState, useEffect } from "react";
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
    tableCellMuted
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ArrowUpRightIcon,
    Squares2X2Icon,
    ListBulletIcon,
} from "@heroicons/react/24/outline";
import { JobSideSheet } from "@/components/sheets/JobSideSheet";
import { CreateJobModal } from "@/components/modals/CreateJobModal";
import { useJobs, useStatusConfig } from "@/lib/swr";
import { useKanbanPage } from "@/lib/hooks/use-kanban-page";
import { DEFAULT_JOB_STATUSES, toKanbanColumns, toStatusConfig } from "@/lib/status-config";
import { TableSkeleton } from "@/components/ui/skeleton";

type Assignee = { id: string; full_name: string | null; email: string | null };

type Job = {
    id: string;
    description: string;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    project?: { id: string; title: string } | null;
    assignees: Assignee[];
    lead?: { id: string; title: string } | null;
    company?: { id: string; name: string } | null;
    scheduled_date: string;
    created_at: string;
};

// Status columns are loaded dynamically from tenant config

const paidStatusLabel: Record<string, string> = {
    not_paid: "Not Paid",
    partly_paid: "Partly Paid",
    paid_in_full: "Paid",
};

const paidStatusColor: Record<string, string> = {
    not_paid: "text-rose-500",
    partly_paid: "text-amber-500",
    paid_in_full: "text-emerald-500",
};

function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function JobsPage() {
    return (
        <Suspense>
            <JobsPageContent />
        </Suspense>
    );
}

function JobsPageContent() {
    const searchParams = useSearchParams();
    const { data: statusData } = useStatusConfig("job");
    const statuses = statusData?.statuses ?? DEFAULT_JOB_STATUSES;
    const statusColumns = toKanbanColumns(statuses);
    const jobStatusConfig = toStatusConfig(statuses);
    const jobsHook = useJobs();
    const { search, setSearch, filteredItems: filteredJobsRaw, isLoading: loading, handleMove, refresh: fetchJobs } = useKanbanPage<Job>({
        swr: jobsHook,
        endpoint: "/api/jobs",
        statusField: "status",
        searchFilter: (job, q) =>
            job.description.toLowerCase().includes(q) ||
            job.company?.name.toLowerCase().includes(q) ||
            job.assignees.some(a => a.full_name?.toLowerCase().includes(q)) || false,
    });
    const filteredJobs = filteredJobsRaw.map(job => ({ ...job, title: job.description }));
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [view, setView] = useState<"table" | "kanban">("table");
    const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

    // Handle deep-link open from URL params
    useEffect(() => {
        if (!jobsHook.data?.items) return;
        const openId = pendingOpenId || searchParams.get("open");
        if (openId) {
            const job = filteredJobsRaw.find((j: Job) => j.id === openId);
            if (job) {
                setSelectedJob(job);
                setSheetOpen(true);
            }
            setPendingOpenId(null);
        }
    }, [jobsHook.data]);

    usePageTitle("Jobs");


    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search jobs, companies or members..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-1 p-1 rounded-full bg-secondary">
                                <button
                                    onClick={() => setView("kanban")}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Kanban view"
                                >
                                    <Squares2X2Icon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("table")}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        view === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Table view"
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Job
                        </Button>
                    </DashboardControls>
                }
            >
                {view === "kanban" ? (
                    <Kanban
                        items={filteredJobs}
                        columns={statusColumns}
                        getItemStatus={(job) => job.status}
                        loading={loading}
                        onCardClick={(job) => { setSelectedJob(job); setSheetOpen(true); }}
                        onItemMove={handleMove}
                        renderCard={(job) => (
                            <div className="space-y-2.5">
                                {/* Job name */}
                                <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-foreground">
                                    {job.description}
                                </p>

                                {/* Value · Company */}
                                <div className="flex items-center gap-0 text-[12px]">
                                    <span className="font-bold tabular-nums text-foreground">
                                        ${job.amount.toLocaleString()}
                                    </span>
                                    {job.company && (
                                        <>
                                            <span className="text-muted-foreground mx-1.5">·</span>
                                            <span className="text-muted-foreground truncate">
                                                {job.company.name}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Paid status */}
                                <span className={cn("text-[11px] font-medium", paidStatusColor[job.paid_status] || "text-muted-foreground")}>
                                    {paidStatusLabel[job.paid_status] || job.paid_status}
                                </span>

                                {/* Assignee avatars in bottom left */}
                                {job.assignees.length > 0 && (
                                    <div className="flex items-center -space-x-1.5 pt-1">
                                        {job.assignees.slice(0, 4).map((a) => (
                                            <div
                                                key={a.id}
                                                title={a.full_name || a.email || ""}
                                                className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold ring-2 ring-background"
                                            >
                                                {getInitials(a.full_name)}
                                            </div>
                                        ))}
                                        {job.assignees.length > 4 && (
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground ring-2 ring-background">
                                                +{job.assignees.length - 4}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    />
                ) : (
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead + " sticky top-0 z-10"}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Description</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Company</th>
                                <th className={tableHeadCell + " px-4"}>Assignees</th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Cost</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Payment</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton rows={8} columns={7} />
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No jobs found.</td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group cursor-pointer"} onClick={() => { setSelectedJob(job); setSheetOpen(true); }}>
                                        <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm truncate max-w-[200px]">{job.description}</span>
                                                {job.scheduled_date && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(job.scheduled_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                            {job.company?.name || "—"}
                                        </td>
                                        <td className={tableCell + " px-4"}>
                                            <div className="flex items-center -space-x-1.5">
                                                {job.assignees.slice(0, 3).map((a) => (
                                                    <div
                                                        key={a.id}
                                                        title={a.full_name || ""}
                                                        className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-background"
                                                    >
                                                        {getInitials(a.full_name)}
                                                    </div>
                                                ))}
                                                {job.assignees.length > 3 && (
                                                    <span className="text-[10px] text-muted-foreground ml-1.5">+{job.assignees.length - 3}</span>
                                                )}
                                                {job.assignees.length === 0 && (
                                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCell + " px-4 text-right sm:text-left"}>
                                            <span className="font-bold text-sm">${job.amount.toFixed(2)}</span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <span className={cn("text-xs font-medium", paidStatusColor[job.paid_status] || "text-muted-foreground")}>
                                                {paidStatusLabel[job.paid_status] || job.paid_status}
                                            </span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    jobStatusConfig[job.status]?.color || "bg-gray-400"
                                                )} />
                                                <span className="text-xs font-medium text-muted-foreground capitalize">
                                                    {jobStatusConfig[job.status]?.label || job.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}>
                                                <ArrowUpRightIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </ScrollableTableLayout>

            <CreateJobModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchJobs()}
            />

            <JobSideSheet
                job={selectedJob}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onUpdate={fetchJobs}
            />
        </>
    );
}
