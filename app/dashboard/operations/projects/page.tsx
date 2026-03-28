"use client";

import { useState } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
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
    ArrowUpRightIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useProjects } from "@/lib/swr";
import { TableSkeleton } from "@/components/ui/skeleton";

type Project = {
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

export default function ProjectsPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading: loading, mutate } = useProjects();
    const projects: Project[] = data?.projects || [];

    const fetchProjects = () => mutate();

    const filteredProjects = projects.filter(project =>
        project.title.toLowerCase().includes(search.toLowerCase()) ||
        project.address.toLowerCase().includes(search.toLowerCase()) ||
        project.homeowner?.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardPage>
            <DashboardHeader
                title="Projects"
                subtitle="View and manage all service projects."
            >
                <Button className="rounded-full px-6 shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Project
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search projects or address..."
                        className="pl-9 rounded-xl border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </DashboardControls>

            {/* Table */}
            <div className="w-full overflow-x-auto">
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Project Name</th>
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
                        ) : filteredProjects.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No projects found.</td>
                            </tr>
                        ) : (
                            filteredProjects.map((project) => (
                                <tr key={project.id} className={tableRow + " group cursor-pointer"}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate">{project.title}</span>
                                            <span className="text-xs text-muted-foreground truncate">{project.address}</span>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {project.homeowner?.full_name || "Unknown"}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50 capitalize">
                                            {project.type?.replace(/_/g, " ") ?? "—"}
                                        </Badge>
                                    </td>
                                    <td className={tableCell + " px-4 text-right sm:text-left"}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden shrink-0 hidden md:block">
                                                <div 
                                                    className="h-full bg-emerald-500 transition-all duration-500" 
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-sm min-w-[2.5rem]">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                project.status === "completed" ? "bg-emerald-500" : 
                                                project.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {project.status.replace(/_/g, " ")}
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
            </div>
        </DashboardPage>
    );
}
