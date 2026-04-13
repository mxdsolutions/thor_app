"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { useMobileHeaderAction } from "@/lib/mobile-header-action-context";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { TablePagination } from "@/components/dashboard/TablePagination";
import { DataTable, DataTableColumn } from "@/components/dashboard/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { CreateServiceModal } from "@/components/modals/CreateServiceModal";
import { ServiceSideSheet } from "@/components/sheets/ServiceSideSheet";
import { useServices } from "@/lib/swr";

type Service = {
    id: string;
    name: string;
    description: string | null;
    initial_value: number | null;
    monthly_value: number | null;
    yearly_value: number | null;
    status: string;
    created_at: string;
};

const columns: DataTableColumn<Service>[] = [
    {
        key: "name",
        label: "Service",
        render: (s) => (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                </div>
            </div>
        ),
    },
    { key: "initial", label: "Initial Value", muted: true, className: "hidden sm:table-cell", render: (s) => formatCurrency(s.initial_value) },
    { key: "monthly", label: "Monthly Value", muted: true, className: "hidden sm:table-cell", render: (s) => formatCurrency(s.monthly_value) },
    { key: "yearly", label: "Yearly Value", muted: true, className: "whitespace-nowrap", render: (s) => formatCurrency(s.yearly_value) },
    {
        key: "status",
        label: "Status",
        className: "hidden sm:table-cell",
        render: (s) => (
            <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", s.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                <span className="font-medium text-muted-foreground capitalize">{s.status}</span>
            </div>
        ),
    },
];

export default function ServicesPage() {
    usePageTitle("Services");
    const [showCreate, setShowCreate] = useState(false);
    useMobileHeaderAction(useCallback(() => setShowCreate(true), []));
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const { data, isLoading, mutate } = useServices(page * PAGE_SIZE, PAGE_SIZE);
    const total: number = data?.total || 0;

    const filtered = useMemo(() => {
        const services: Service[] = data?.items || [];
        if (!search) return services;
        const q = search.toLowerCase();
        return services.filter(s =>
            s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
        );
    }, [data?.items, search]);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0 md:min-w-[320px] md:max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search services..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="px-6 shrink-0 hidden md:inline-flex" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Service
                        </Button>
                    </DashboardControls>
                }
                footer={<TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
            >
                <DataTable
                    items={filtered}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No services found."
                    onRowClick={setSelectedService}
                />
            </ScrollableTableLayout>

            <CreateServiceModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => mutate()}
            />

            <ServiceSideSheet
                service={selectedService}
                open={!!selectedService}
                onOpenChange={(open) => { if (!open) setSelectedService(null); }}
            />
        </>
    );
}
