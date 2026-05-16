"use client";

import { useCallback, useMemo, useState } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search as MagnifyingGlassIcon, Plus as PlusIcon } from "lucide-react";
import { CreateTimesheetModal } from "@/components/modals/CreateTimesheetModal";
import { ClockInOutCard } from "@/components/timesheets/ClockInOutCard";
import { TimesheetSideSheet, type TimesheetSideSheetItem } from "@/components/sheets/TimesheetSideSheet";
import { useTimesheets, useProfiles, type ArchiveScope } from "@/lib/swr";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { formatDuration } from "@/lib/utils";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

type TimesheetUser = {
    id: string;
    full_name: string | null;
    email: string | null;
};

type TimesheetRow = TimesheetSideSheetItem & {
    user: TimesheetUser | null;
};

type ProfileUser = {
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string | null };
};

const PAGE_SIZE = 20;

function durationMs(row: TimesheetRow): number {
    if (!row.end_at) return 0;
    return Math.max(0, new Date(row.end_at).getTime() - new Date(row.start_at).getTime());
}

function timeLabel(value: string) {
    return new Date(value).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function dateLabel(value: string) {
    return new Date(value).toLocaleDateString("en-AU", { dateStyle: "medium" });
}

function initials(user: TimesheetUser | null): string {
    if (user?.full_name) {
        return user.full_name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return "?";
}

const columns: DataTableColumn<TimesheetRow>[] = [
    {
        key: "employee",
        label: "Employee",
        render: (row) => {
            const name = row.user?.full_name || row.user?.email || "Unknown";
            const inner = (
                <div className="flex items-center gap-3 min-w-0">
                    <div className="hidden sm:flex w-9 h-9 rounded-full bg-secondary items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                        {initials(row.user)}
                    </div>
                    <span className="font-semibold truncate underline underline-offset-2">{name}</span>
                </div>
            );
            return row.user?.id ? (
                <EntityPreviewCard entityType="user" entityId={row.user.id}>{inner}</EntityPreviewCard>
            ) : inner;
        },
    },
    {
        key: "job",
        label: "Job",
        render: (row) => row.job ? (
            <EntityPreviewCard entityType="job" entityId={row.job.id} className="underline">
                <span className="truncate">
                    {row.job.job_title}
                    {row.job.reference_id ? <span className="text-muted-foreground"> · {row.job.reference_id}</span> : null}
                </span>
            </EntityPreviewCard>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
        key: "date",
        label: "Date",
        muted: true,
        className: "hidden sm:table-cell",
        render: (row) => dateLabel(row.start_at),
    },
    {
        key: "range",
        label: "Time",
        muted: true,
        className: "hidden md:table-cell",
        render: (row) => `${timeLabel(row.start_at)} – ${row.end_at ? timeLabel(row.end_at) : "running"}`,
    },
    {
        key: "duration",
        label: "Duration",
        className: "text-right",
        render: (row) => (
            <span className="font-medium tabular-nums">
                {row.end_at ? formatDuration(durationMs(row)) : <span className="text-emerald-600">running</span>}
            </span>
        ),
    },
];

export default function TimesheetsPage() {
    usePageTitle("Timesheets");

    const [showCreate, setShowCreate] = useState(false);
    useMobileHeaderAction(useCallback(() => setShowCreate(true), []));

    const [search, setSearch] = useState("");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [employeeFilter, setEmployeeFilter] = useState<string>("all");
    const [page, setPage] = useState(0);
    const debouncedSearch = useDebouncedValue(search);

    const { data, isLoading, error, mutate } = useTimesheets({
        userId: employeeFilter === "all" ? null : employeeFilter,
        search: debouncedSearch || undefined,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        archive: archiveScope,
    });
    const items: TimesheetRow[] = data?.items || [];
    const total: number = data?.total || 0;

    const [selected, setSelected] = useState<TimesheetRow | null>(null);

    const { data: profilesData } = useProfiles();
    const employees: ProfileUser[] = useMemo(
        () => profilesData?.users ?? [],
        [profilesData],
    );

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Timesheets</h1>
                        </div>
                        <div className="px-4 md:px-6 lg:px-10">
                            <ClockInOutCard />
                        </div>
                        <DashboardControls>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="relative flex-1 min-w-0 md:min-w-[280px] md:max-w-md">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search timesheets..."
                                        className="pl-9 rounded-xl border-border/50"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                    />
                                </div>
                                <MobileFilters>
                                    <Select value={employeeFilter} onValueChange={(v) => { setEmployeeFilter(v); setPage(0); }}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All employees</SelectItem>
                                            <SelectItem value="me">Me</SelectItem>
                                            {employees.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.user_metadata?.full_name || u.email || u.id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={archiveScope} onValueChange={(v) => { setArchiveScope(v as ArchiveScope); setPage(0); }}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                            <SelectItem value="all">All</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </MobileFilters>
                            </div>
                            <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowCreate(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Timesheet
                            </Button>
                        </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={items}
                    columns={columns}
                    loading={isLoading}
                    error={error}
                    emptyMessage="No timesheet entries yet."
                    onRowClick={setSelected}
                />
            </ScrollableTableLayout>

            <CreateTimesheetModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => mutate()}
            />

            <TimesheetSideSheet
                timesheet={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate()}
            />
        </>
    );
}
