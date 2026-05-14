"use client";

import { useState, useCallback } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search as MagnifyingGlassIcon, Plus as PlusIcon } from "lucide-react";
import { CreateCompanyModal } from "@/components/modals/CreateCompanyModal";
import { CompanySideSheet } from "@/components/sheets/CompanySideSheet";
import { useCompanies, type ArchiveScope } from "@/lib/swr";
import { ArchiveScopedStatusSelect } from "@/components/dashboard/ArchiveScopedStatusSelect";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";

type Company = {
    id: string;
    name: string;
    industry: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    status: string;
    created_at: string;
};

const columns: DataTableColumn<Company>[] = [
    {
        key: "name",
        label: "Company",
        render: (c) => (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                </div>
            </div>
        ),
    },
    { key: "industry", label: "Industry", muted: true, className: "hidden sm:table-cell", render: (c) => c.industry || "—" },
    { key: "location", label: "Location", muted: true, className: "hidden sm:table-cell", render: (c) => [c.city, c.state].filter(Boolean).join(", ") || "—" },
    { key: "phone", label: "Phone", muted: true, render: (c) => c.phone || "—" },
    {
        key: "status",
        label: "Status",
        className: "hidden sm:table-cell",
        render: (c) => (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", c.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="font-medium text-muted-foreground capitalize">{c.status}</span>
            </div>
        ),
    },
];

export default function CompaniesPage() {
    usePageTitle("Companies");
    const [showCreate, setShowCreate] = useState(false);
    useMobileHeaderAction(useCallback(() => setShowCreate(true), []));
    const [search, setSearch] = useState("");
    const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const debouncedSearch = useDebouncedValue(search);
    const { data, isLoading, error, mutate } = useCompanies(debouncedSearch || undefined, page * PAGE_SIZE, PAGE_SIZE, archiveScope);
    const companies: Company[] = data?.items || [];
    const total: number = data?.total || 0;
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <div className="space-y-4">
                        <div className="px-4 md:px-6 lg:px-10">
                            <h1 className="font-statement text-2xl font-extrabold tracking-tight">Companies</h1>
                        </div>
                        <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search companies..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <ArchiveScopedStatusSelect
                                archive={archiveScope}
                                onArchiveChange={setArchiveScope}
                                status="All"
                                onStatusChange={() => { }}
                                statuses={[]}
                            />
                        </div>
                        <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Company
                        </Button>
                    </DashboardControls>
                    </div>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={companies}
                    columns={columns}
                    loading={isLoading}
                    error={error}
                    emptyMessage="No companies found."
                    onRowClick={setSelectedCompany}
                />
            </ScrollableTableLayout>

            <CreateCompanyModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => mutate()}
            />

            <CompanySideSheet
                company={selectedCompany}
                open={!!selectedCompany}
                onOpenChange={(open) => { if (!open) setSelectedCompany(null); }}
            />
        </>
    );
}
