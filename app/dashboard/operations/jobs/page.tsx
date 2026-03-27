"use client";

import { useState, useEffect } from "react";
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

type Job = {
    id: string;
    description: string;
    status: string;
    amount: number;
    project?: {
        title: string;
    };
    assigned_to?: {
        full_name: string;
    };
    scheduled_date: string;
};

export default function JobsPage() {
    const [search, setSearch] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/jobs");
            if (!res.ok) throw new Error("Failed to fetch jobs");
            const data = await res.json();
            setJobs(data.jobs || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load jobs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const filteredJobs = jobs.filter(job =>
        job.description.toLowerCase().includes(search.toLowerCase()) ||
        job.project?.title.toLowerCase().includes(search.toLowerCase()) ||
        job.assigned_to?.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardPage>
            <DashboardHeader
                title="Jobs"
                subtitle="View and manage all service jobs."
            >
                <Button className="rounded-full px-6 shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Job
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs, projects or members..."
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
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Description</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Project</th>
                            <th className={tableHeadCell + " px-4"}>Assigned To</th>
                            <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Cost</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading jobs...</td>
                            </tr>
                        ) : filteredJobs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No jobs found.</td>
                            </tr>
                        ) : (
                            filteredJobs.map((job) => (
                                <tr key={job.id} className={tableRow + " group cursor-pointer"}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate max-w-[200px]">{job.description}</span>
                                            {job.scheduled_date && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(job.scheduled_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                        {job.project?.title || "No Project"}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-border/50">
                                                {job.assigned_to?.full_name?.charAt(0) || "?"}
                                            </div>
                                            <span className="text-sm truncate">{job.assigned_to?.full_name || "Unassigned"}</span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " px-4 text-right sm:text-left"}>
                                        <span className="font-bold text-sm">${job.amount.toFixed(2)}</span>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                job.status === "completed" ? "bg-emerald-500" : 
                                                job.status === "in_progress" ? "bg-blue-500" : 
                                                job.status === "cancelled" ? "bg-red-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {job.status.replace(/_/g, " ")}
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
