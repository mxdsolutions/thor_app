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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconPlus as PlusIcon, IconArrowUpRight as ArrowUpRightIcon } from "@tabler/icons-react";
import { useScopes } from "@/lib/swr";
import { TableSkeleton } from "@/components/ui/skeleton";

type Scope = {
    id: string;
    title: string;
    address: string;
    type: string;
    status: string;
    progress: number;
    homeowner?: {
        full_name: string;
        email: string;
    };
};

export default function ScopesPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading: loading } = useScopes();
    const scopes: Scope[] = data?.items || [];

    const filteredScopes = scopes.filter(scope =>
        scope.title.toLowerCase().includes(search.toLowerCase()) ||
        scope.address.toLowerCase().includes(search.toLowerCase()) ||
        scope.homeowner?.full_name.toLowerCase().includes(search.toLowerCase())
    );

    usePageTitle("Scopes");

    return (
        <ScrollableTableLayout
            header={
                <DashboardControls>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 min-w-[320px] max-w-xl">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search scopes or address..."
                                className="pl-9 rounded-xl border-border/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button className="px-6 shrink-0">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Scope
                    </Button>
                </DashboardControls>
            }
        >
            <table className={tableBase + " border-collapse min-w-full"}>
                <thead className={tableHead + " sticky top-0 z-10"}>
                    <tr>
                        <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Scope Name</th>
                        <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Customer</th>
                        <th className={tableHeadCell + " px-4"}>Type</th>
                        <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Progress</th>
                        <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                        <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <TableSkeleton rows={8} columns={6} />
                    ) : filteredScopes.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No scopes found.</td>
                        </tr>
                    ) : (
                        filteredScopes.map((scope) => (
                            <tr key={scope.id} className={tableRow + " group cursor-pointer"}>
                                <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold truncate">{scope.title}</span>
                                        <span className="text-xs text-muted-foreground truncate">{scope.address}</span>
                                    </div>
                                </td>
                                <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                    {scope.homeowner?.full_name || "Unknown"}
                                </td>
                                <td className={tableCell + " px-4"}>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50 capitalize">
                                        {scope.type?.replace(/_/g, " ") ?? "—"}
                                    </Badge>
                                </td>
                                <td className={tableCell + " px-4 text-right sm:text-left"}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden shrink-0 hidden md:block">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${scope.progress}%` }}
                                            />
                                        </div>
                                        <span className="font-bold text-sm min-w-[2.5rem]">{scope.progress}%</span>
                                    </div>
                                </td>
                                <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            scope.status === "completed" ? "bg-emerald-500" :
                                            scope.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"
                                        )} />
                                        <span className="text-xs font-medium text-muted-foreground capitalize">
                                            {scope.status.replace(/_/g, " ")}
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
    );
}
