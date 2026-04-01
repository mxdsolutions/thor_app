"use client";

import { useState } from "react";
import { DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { CreateCompanyModal } from "@/components/modals/CreateCompanyModal";
import { CompanySideSheet } from "@/components/sheets/CompanySideSheet";
import { toast } from "sonner";
import { useCompanies } from "@/lib/swr";
import { TableSkeleton } from "@/components/ui/skeleton";

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

export default function CompaniesPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading: loading, mutate } = useCompanies();
    const companies: Company[] = data?.companies || [];
    const [showCreate, setShowCreate] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const fetchCompanies = () => mutate();

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <ScrollableTableLayout
                header={
                    <>
                        <DashboardHeader
                            title="Companies"
                            subtitle="Manage your company records and organizations."
                        >
                            <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Company
                            </Button>
                        </DashboardHeader>

                        <DashboardControls>
                            <div className="relative flex-1 max-w-sm">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search companies..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </DashboardControls>
                    </>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Company</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Industry</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Location</th>
                            <th className={tableHeadCell + " px-4"}>Phone</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableSkeleton rows={8} columns={6} />
                        ) : filteredCompanies.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No companies found.</td>
                            </tr>
                        ) : (
                            filteredCompanies.map((company) => (
                                <tr key={company.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedCompany(company)}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                {company.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{company.name}</p>
                                                {company.email && <p className="text-xs text-muted-foreground truncate">{company.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {company.industry || "—"}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {[company.city, company.state].filter(Boolean).join(", ") || "—"}
                                    </td>
                                    <td className={tableCellMuted + " px-4"}>
                                        {company.phone || "—"}
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                company.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {company.status}
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

            <CreateCompanyModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchCompanies()}
            />

            <CompanySideSheet
                company={selectedCompany}
                open={!!selectedCompany}
                onOpenChange={(open) => { if (!open) setSelectedCompany(null); }}
            />
        </>
    );
}
