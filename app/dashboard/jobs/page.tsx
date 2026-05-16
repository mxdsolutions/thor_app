"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { usePermissionOptional } from "@/lib/tenant-context";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
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
import { Search as MagnifyingGlassIcon, Plus as PlusIcon, ArrowUpRight as ArrowUpRightIcon, LayoutGrid as Squares2X2Icon, List as ListBulletIcon, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { CreateJobModal } from "@/components/modals/CreateJobModal";
import { useJobs, useStatusConfig, useProfiles, type ArchiveScope } from "@/lib/swr";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { useKanbanPage } from "@/lib/hooks/use-kanban-page";
import { DEFAULT_JOB_STATUSES, toKanbanColumns, toStatusConfig, type StatusItem } from "@/lib/status-config";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageMetrics, type PageMetric } from "@/components/dashboard/PageMetrics";
import { formatCurrency } from "@/lib/utils";
import { useCreateDeepLink } from "@/lib/hooks/use-create-deep-link";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

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
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const jobsHook = useJobs(0, 50, archiveScope);
    const { search, setSearch, filteredItems: filteredJobsRaw, isLoading: loading, handleMove, refresh: fetchJobs } = useKanbanPage<Job>({
        swr: jobsHook,
        endpoint: "/api/jobs",
        statusField: "status",
        searchFilter: (job, q) =>
            job.job_title.toLowerCase().includes(q) ||
            (job.description?.toLowerCase().includes(q) ?? false) ||
            (job.reference_id?.toLowerCase().includes(q) ?? false) ||
            (job.contact ? `${job.contact.first_name} ${job.contact.last_name}`.toLowerCase().includes(q) : false) ||
            job.company?.name.toLowerCase().includes(q) ||
            job.assignees.some(a => a.full_name?.toLowerCase().includes(q)) || false,
    });
    const { data: profilesData } = useProfiles();
    const users: Array<{ id: string; full_name: string | null; email: string | null }> = profilesData?.users || [];

    const [assignedFilter, setAssignedFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [paidFilter, setPaidFilter] = useState("All");

    const filteredJobs = useMemo(() => {
        return filteredJobsRaw
            .filter((job: Job) => {
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
    }, [filteredJobsRaw, assignedFilter, statusFilter, paidFilter]);
    const [showCreate, setShowCreate] = useState(false);
    useCreateDeepLink(() => setShowCreate(true));
    const [view, setView] = useState<"table" | "kanban">("table");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    type SortKey = "job_title" | "customer" | "assigned" | "amount" | "paid_status" | "status";
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const toggleSort = useCallback((key: SortKey) => {
        setPage(0);
        setSortKey((prevKey) => {
            if (prevKey !== key) {
                setSortDir("asc");
                return key;
            }
            // Same key — cycle: asc → desc → off
            setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
            return key;
        });
    }, []);

    const sortedJobs = useMemo(() => {
        if (!sortKey) return filteredJobs;
        const direction = sortDir === "asc" ? 1 : -1;
        const statusOrder = (statuses as StatusItem[]).reduce<Record<string, number>>((acc, s, i) => { acc[s.id] = i; return acc; }, {});
        const paidOrder: Record<string, number> = { not_paid: 0, partly_paid: 1, paid_in_full: 2 };
        const valueOf = (job: Job & { title: string }): string | number => {
            switch (sortKey) {
                case "job_title": return job.job_title?.toLowerCase() ?? "";
                case "customer": return (job.contact ? `${job.contact.first_name} ${job.contact.last_name}` : (job.company?.name ?? "")).toLowerCase();
                case "assigned": return job.assignees[0]?.full_name?.toLowerCase() ?? job.assignees[0]?.email?.toLowerCase() ?? "";
                case "amount": return job.amount ?? 0;
                case "paid_status": return paidOrder[job.paid_status] ?? 99;
                case "status": return statusOrder[job.status] ?? 99;
            }
        };
        return [...filteredJobs].sort((a, b) => {
            const av = valueOf(a);
            const bv = valueOf(b);
            // Push empty strings to the bottom regardless of direction so blank rows don't dominate the top
            if (av === "" && bv !== "") return 1;
            if (bv === "" && av !== "") return -1;
            if (av < bv) return -1 * direction;
            if (av > bv) return 1 * direction;
            return 0;
        });
    }, [filteredJobs, sortKey, sortDir, statuses]);

    const paginatedJobs = useMemo(() => sortedJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [sortedJobs, page]);

    const totalCost = useMemo(() => filteredJobs.reduce((sum, j) => sum + (j.amount || 0), 0), [filteredJobs]);
    const awaitingPayment = useMemo(() =>
        filteredJobs.reduce((sum, j) => {
            if (j.paid_status === "paid_in_full") return sum;
            return sum + Math.max(0, (j.amount || 0) - (j.total_payment_received || 0));
        }, 0),
        [filteredJobs]
    );

    const metrics: PageMetric[] = [
        { label: "Active jobs", value: filteredJobs.length.toLocaleString(), accent: true },
        { label: "Pipeline value", value: formatCurrency(totalCost) },
        { label: "Awaiting payment", value: formatCurrency(awaitingPayment), tone: awaitingPayment > 0 ? "warning" : "default" },
    ];

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
        return sortDir === "asc"
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />;
    };

    const openJob = (jobId: string) => router.push(`/dashboard/jobs/${jobId}`);

    usePageTitle("Jobs");
    const canWriteJobs = usePermissionOptional("ops.jobs", "write", true);
    useMobileHeaderAction(useCallback(() => {
        if (canWriteJobs) setShowCreate(true);
    }, [canWriteJobs]));


    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Jobs</h1>
                        </div>
                        <PageMetrics metrics={metrics} />
                        <DashboardControls>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[280px] md:max-w-sm">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search jobs..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <MobileFilters>
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
                                <ArchiveScopedStatusSelect
                                    archive={archiveScope}
                                    onArchiveChange={setArchiveScope}
                                    status={statusFilter}
                                    onStatusChange={setStatusFilter}
                                    statuses={(statuses as StatusItem[]).map((s) => ({ id: s.id, label: s.label }))}
                                />

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
                            </MobileFilters>
                            <div className="hidden md:flex gap-1 p-1 rounded-lg bg-secondary">
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
                        {canWriteJobs && (
                            <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowCreate(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Job
                            </Button>
                        )}
                        </DashboardControls>
                    </div>
                }
                footer={view === "table" ? (
                    <TablePagination page={page} pageSize={PAGE_SIZE} total={sortedJobs.length} onPageChange={setPage} />
                ) : undefined}
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
                                            <EntityPreviewCard entityType="company" entityId={job.company.id} className="underline">
                                                <span className="text-muted-foreground truncate">
                                                    {job.company.name}
                                                </span>
                                            </EntityPreviewCard>
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
                                            <EntityPreviewCard key={a.id} entityType="user" entityId={a.id}>
                                                <div
                                                    title={a.full_name || a.email || ""}
                                                    className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold ring-2 ring-background"
                                                >
                                                    {getInitials(a.full_name)}
                                                </div>
                                            </EntityPreviewCard>
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
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                    <button type="button" onClick={() => toggleSort("job_title")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Job Name <SortIcon columnKey="job_title" />
                                    </button>
                                </th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>
                                    <button type="button" onClick={() => toggleSort("customer")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Customer <SortIcon columnKey="customer" />
                                    </button>
                                </th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>
                                    <button type="button" onClick={() => toggleSort("assigned")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Assigned <SortIcon columnKey="assigned" />
                                    </button>
                                </th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>
                                    <button type="button" onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Cost <SortIcon columnKey="amount" />
                                    </button>
                                </th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>
                                    <button type="button" onClick={() => toggleSort("paid_status")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Payment <SortIcon columnKey="paid_status" />
                                    </button>
                                </th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>
                                    <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider">
                                        Status <SortIcon columnKey="status" />
                                    </button>
                                </th>
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
                                paginatedJobs.map((job) => (
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
                                            {job.contact ? (
                                                <EntityPreviewCard entityType="contact" entityId={job.contact.id} className="underline">
                                                    <span>{job.contact.first_name} {job.contact.last_name}</span>
                                                </EntityPreviewCard>
                                            ) : job.company ? (
                                                <EntityPreviewCard entityType="company" entityId={job.company.id} className="underline">
                                                    <span>{job.company.name}</span>
                                                </EntityPreviewCard>
                                            ) : "—"}
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[180px]"}>
                                            {job.assignees.length === 0
                                                ? <span className="text-muted-foreground">Unassigned</span>
                                                : (
                                                    <span className="inline-flex flex-wrap gap-x-1">
                                                        {job.assignees.map((a, i) => (
                                                            <span key={a.id}>
                                                                <EntityPreviewCard entityType="user" entityId={a.id} className="underline">
                                                                    <span>{a.full_name || a.email || "—"}</span>
                                                                </EntityPreviewCard>
                                                                {i < job.assignees.length - 1 && <span>, </span>}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                        </td>
                                        <td className={tableCell + " px-4 text-right sm:text-left"}>
                                            <span className="font-bold">${job.amount.toFixed(2)}</span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <span className={cn("font-medium", paidStatusTextClass[job.paid_status] || "text-muted-foreground")}>
                                                {paidStatusLabel[job.paid_status] || job.paid_status}
                                            </span>
                                        </td>
                                        <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    jobStatusConfig[job.status]?.color || "bg-gray-400"
                                                )} />
                                                <span className="font-medium text-muted-foreground capitalize">
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
