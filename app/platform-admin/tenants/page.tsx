"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IconPlus as PlusIcon, IconSearch as MagnifyingGlassIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
import { CreateTenantModal } from "@/components/modals/CreateTenantModal";
import { TenantSideSheet } from "@/components/sheets/TenantSideSheet";
import { usePlatformTenants } from "@/lib/swr";
import { TableSkeleton } from "@/components/ui/skeleton";

type Tenant = {
    id: string;
    name: string;
    company_name: string | null;
    slug: string;
    plan: string;
    status: string;
    max_users: number;
    member_count: number;
    owner: { full_name: string; email: string } | null;
    created_at: string;
};

const STATUS_FILTERS = [
    { label: "All Statuses", value: "All" },
    { label: "Active", value: "active" },
    { label: "Suspended", value: "suspended" },
];

export default function TenantsPage() {
    usePageTitle("Tenants");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const { data, isLoading, mutate } = usePlatformTenants(search, statusFilter === "All" ? "" : statusFilter);

    const tenants: Tenant[] = data?.items || [];

    return (
        <>
            <ScrollableTableLayout
                header={
                    <>
                        <DashboardControls>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 max-w-md">
                                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tenants..."
                                        className="pl-9 rounded-xl border-border/50"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] rounded-xl border-border/50 h-10">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_FILTERS.map((f) => (
                                            <SelectItem key={f.value} value={f.value}>
                                                {f.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="rounded-full px-6 shrink-0" onClick={() => setCreateOpen(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                New Tenant
                            </Button>
                        </DashboardControls>
                    </>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Company</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Slug</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Plan</th>
                            <th className={tableHeadCell + " px-4"}>Status</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Users</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Owner</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <TableSkeleton rows={8} columns={7} />
                        ) : tenants.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No tenants found.</td>
                            </tr>
                        ) : (
                            tenants.map((tenant) => (
                                <tr
                                    key={tenant.id}
                                    className={tableRow + " group cursor-pointer"}
                                    onClick={() => setSelectedTenantId(tenant.id)}
                                >
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                {(tenant.company_name || tenant.name).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{tenant.company_name || tenant.name}</p>
                                                {tenant.owner?.email && <p className="text-xs text-muted-foreground truncate">{tenant.owner.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        <code className="text-xs">{tenant.slug}</code>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell capitalize"}>
                                        {tenant.plan}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                tenant.status === "active" ? "bg-emerald-500" : tenant.status === "suspended" ? "bg-rose-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {tenant.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {tenant.member_count} / {tenant.max_users}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {tenant.owner?.full_name || "—"}
                                    </td>
                                    <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </ScrollableTableLayout>

            <CreateTenantModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(tenant) => {
                    mutate();
                    setSelectedTenantId(tenant.id as string);
                }}
            />

            <TenantSideSheet
                tenantId={selectedTenantId}
                open={!!selectedTenantId}
                onOpenChange={(open) => { if (!open) setSelectedTenantId(null); }}
                onUpdate={() => mutate()}
            />
        </>
    );
}
