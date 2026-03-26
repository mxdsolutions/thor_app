"use client";

import { useState, useEffect } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
    filterPillBase,
    filterPillActive,
    filterPillInactive
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
import { toast } from "sonner";

type Lead = {
    id: string;
    title: string;
    source: string | null;
    status: string;
    priority: string;
    estimated_value: number | null;
    contact?: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
    company?: {
        id: string;
        name: string;
    } | null;
    created_at: string;
};

const statusFilters = ["all", "new", "contacted", "qualified", "unqualified", "converted"];

const statusColors: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-600",
    contacted: "bg-amber-500/10 text-amber-600",
    qualified: "bg-emerald-500/10 text-emerald-600",
    unqualified: "bg-rose-500/10 text-rose-600",
    converted: "bg-violet-500/10 text-violet-600",
};

const priorityDot: Record<string, string> = {
    low: "bg-slate-400",
    medium: "bg-amber-500",
    high: "bg-rose-500",
};

export default function LeadsPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/leads");
            if (!res.ok) throw new Error("Failed to fetch leads");
            const data = await res.json();
            setLeads(data.leads || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const filteredLeads = leads.filter(lead => {
        const q = search.toLowerCase();
        const matchesSearch = lead.title.toLowerCase().includes(q) ||
            lead.contact?.first_name.toLowerCase().includes(q) ||
            lead.contact?.last_name.toLowerCase().includes(q) ||
            lead.company?.name.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardPage>
            <DashboardHeader
                title="Leads"
                subtitle="Track and manage your sales leads."
            >
                <Button className="rounded-full px-6 shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Lead
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search leads..."
                        className="pl-9 rounded-xl border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {statusFilters.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                filterPillBase,
                                statusFilter === s ? filterPillActive : filterPillInactive
                            )}
                        >
                            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </DashboardControls>

            <div className="w-full overflow-x-auto">
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Source</th>
                            <th className={tableHeadCell + " px-4"}>Contact</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Est. Value</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Priority</th>
                            <th className={tableHeadCell + " px-4"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">Loading leads...</td>
                            </tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No leads found.</td>
                            </tr>
                        ) : (
                            filteredLeads.map((lead) => (
                                <tr key={lead.id} className={tableRow + " group cursor-pointer"}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <span className="font-semibold text-sm truncate max-w-[200px] block">{lead.title}</span>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {lead.source ? (
                                            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50 capitalize">
                                                {lead.source}
                                            </Badge>
                                        ) : "—"}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <span className="text-sm truncate">
                                            {lead.contact ? `${lead.contact.first_name} ${lead.contact.last_name}` : "—"}
                                        </span>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <span className="font-bold text-sm">
                                            {lead.estimated_value != null ? `$${lead.estimated_value.toLocaleString()}` : "—"}
                                        </span>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", priorityDot[lead.priority] || "bg-slate-400")} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">{lead.priority}</span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "rounded-full px-2 py-0 text-[10px] uppercase tracking-wider font-bold border-0",
                                                statusColors[lead.status] || ""
                                            )}
                                        >
                                            {lead.status}
                                        </Badge>
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
