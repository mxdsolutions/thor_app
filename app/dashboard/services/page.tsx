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
    tableCellMuted
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
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

export default function ServicesPage() {
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const { data: servicesData, isLoading: loading, mutate } = useServices();
    const services: Service[] = servicesData?.items || [];

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
    );

    usePageTitle("Services");

    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 min-w-[320px] max-w-xl">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search services..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="px-6 shrink-0" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Service
                        </Button>
                    </DashboardControls>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Service</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Initial Value</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Monthly Value</th>
                            <th className={tableHeadCell + " px-4"}>Yearly Value</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading services...</td>
                            </tr>
                        ) : filteredServices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No services found.</td>
                            </tr>
                        ) : (
                            filteredServices.map((service) => (
                                <tr key={service.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedService(service)}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                {service.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{service.name}</p>
                                                {service.description && <p className="text-xs text-muted-foreground truncate">{service.description}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {formatCurrency(service.initial_value)}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {formatCurrency(service.monthly_value)}
                                    </td>
                                    <td className={tableCellMuted + " px-4"}>
                                        {formatCurrency(service.yearly_value)}
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                service.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {service.status}
                                            </span>
                                        </div>
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
