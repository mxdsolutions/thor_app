"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
    paidStatusTextClass,
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn } from "@/lib/utils";
import {
    IconSearch as MagnifyingGlassIcon,
    IconPlus as PlusIcon,
    IconArrowUpRight as ArrowUpRightIcon,
    IconLayoutGrid as Squares2X2Icon,
    IconList as ListBulletIcon,
} from "@tabler/icons-react";
import { CreateJobModal } from "@/components/modals/CreateJobModal";
import { useJobs, useStatusConfig, useServices, useProfiles } from "@/lib/swr";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useKanbanPage } from "@/lib/hooks/use-kanban-page";
import { DEFAULT_JOB_STATUSES, toKanbanColumns, toStatusConfig, type StatusItem } from "@/lib/status-config";
import { TableSkeleton } from "@/components/ui/skeleton";

type Assignee = { id: string; full_name: string | null; email: string | null };

type Job = {
    id: string;
    job_title: string;
    description: string | null;
    reference_id: string | null;
    notes: string | null;
    status: string;
    amount: number;
    paid_status: string;
    total_payment_received: number;
    project?: { id: string; title: string } | null;
    assignees: Assignee[];
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    service?: { id: string; name: string } | null;
    scheduled_date: string;
    created_at: string;
};

// Status columns are loaded dynamically from tenant config

const paidStatusLabel: Record<string, string> = {
    not_paid: "Not Paid",
    partly_paid: "Partly Paid",
    paid_in_full: "Paid",
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
    const router = useRouter();
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
            job.job_title.toLowerCase().includes(q) ||
            (job.description?.toLowerCase().includes(q) ?? false) ||
            (job.reference_id?.toLowerCase().includes(q) ?? false) ||
            (job.contact ? `${job.contact.first_name} ${job.contact.last_name}`.toLowerCase().includes(q) : false) ||
            (job.service?.name.toLowerCase().includes(q) ?? false) ||
            job.company?.name.toLowerCase().includes(q) ||
            job.assignees.some(a => a.full_name?.toLowerCase().includes(q)) || false,
    });
    const { data: servicesData } = useServices();
    const services: Array<{ id: string; name: string }> = servicesData?.items || [];
    const { data: profilesData } = useProfiles();
    const users: Array<{ id: string; full_name: string | null; email: string | null }> = profilesData?.users || [];

    const [typeFilter, setTypeFilter] = useState("All");
    const [assignedFilter, setAssignedFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [paidFilter, setPaidFilter] = useState("All");

    const filteredJobs = useMemo(() => {
        return filteredJobsRaw
            .filter((job: Job) => {
                if (typeFilter !== "All" && job.service?.id !== typeFilter) return false;
                if (assignedFilter !== "All") {
                    if (assignedFilter === "unassigned") {
                        if (job.assignees.length > 0) return false;
                    } else if (!job.assignees.some(a => a.id === assignedFilter)) {
                        return false;
                    }
                }
                if (statusFilter !== "All" && job.status !== statusFilter) return false;
                if (paidFilter !== "All" && job.paid_status !== paidFilter) return false;
                return true;
            })
            .map(job => ({ ...job, title: job.job_title }));
    }, [filteredJobsRaw, typeFilter, assignedFilter, statusFilter, paidFilter]);
    const [showCreate, setShowCreate] = useState(false);
    const [view, setView] = useState<"table" | "kanban">("table");

    const openJob = (jobId: string) => router.push(`/dashboard/jobs/${jobId}`);

    usePageTitle("Jobs");


    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[280px] max-w-sm">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search jobs..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Types</SelectItem>
                                    {services.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Assigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Anyone</SelectItem>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email || "—"}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    {(statuses as StatusItem[]).map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={paidFilter} onValueChange={setPaidFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Payment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Payments</SelectItem>
                                    <SelectItem value="not_paid">Not Paid</SelectItem>
                                    <SelectItem value="partly_paid">Partly Paid</SelectItem>
                                    <SelectItem value="paid_in_full">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-1 p-1 rounded-lg bg-secondary">
                                <button
                                    onClick={() => setView("kanban")}
                                    className={cn(
                                        "p-1.5 rounded-sm transition-colors",
                                        view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Kanban view"
                                >
                                    <Squares2X2Icon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("table")}
                                    className={cn(
                                        "p-1.5 rounded-sm transition-colors",
                                        view === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Table view"
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <Button className="px-6 shrink-0" onClick={() => setShowCreate(true)}>
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
                        onCardClick={(job) => openJob(job.id)}
                        onItemMove={handleMove}
                        renderCard={(job) => (
                            <div className="space-y-2.5">
                                {/* Job name */}
                                <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-foreground">
                                    {job.job_title}
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
                                <span className={cn("text-[11px] font-medium", paidStatusTextClass[job.paid_status] || "text-muted-foreground")}>
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
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Job Name</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Type</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Customer</th>
                                <th className={tableHeadCell + " px-4"}>Assigned</th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Cost</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Payment</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton rows={8} columns={8} />
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No jobs found.</td>
                                </tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className={tableRow + " group cursor-pointer"} onClick={() => openJob(job.id)}>
                                        <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold truncate max-w-[200px]">{job.job_title}</span>
                                                {job.reference_id && (
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {job.reference_id}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                            {job.service?.name || "—"}
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                            {job.contact ? `${job.contact.first_name} ${job.contact.last_name}` : (job.company?.name || "—")}
                                        </td>
                                        <td className={tableCellMuted + " px-4 truncate max-w-[180px]"}>
                                            {job.assignees.length === 0
                                                ? <span className="text-xs text-muted-foreground">Unassigned</span>
                                                : <span className="text-sm">{job.assignees.map(a => a.full_name || a.email || "—").join(", ")}</span>}
                                        </td>
                                        <td className={tableCell + " px-4 text-right sm:text-left"}>
                                            <span className="font-bold text-sm">${job.amount.toFixed(2)}</span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <span className={cn("text-xs font-medium", paidStatusTextClass[job.paid_status] || "text-muted-foreground")}>
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
                                            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openJob(job.id); }}>
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
                onCreated={(job) => {
                    fetchJobs();
                    const created = job as { id?: string };
                    if (created?.id) router.push(`/dashboard/jobs/${created.id}`);
                }}
            />
        </>
    );
}
