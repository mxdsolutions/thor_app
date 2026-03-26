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

type Opportunity = {
    id: string;
    title: string;
    stage: string;
    value: number;
    probability: number | null;
    expected_close_date: string | null;
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

const stageFilters = ["all", "prospecting", "proposal", "negotiation", "closed_won", "closed_lost"];

const stageColors: Record<string, string> = {
    prospecting: "bg-blue-500/10 text-blue-600",
    proposal: "bg-amber-500/10 text-amber-600",
    negotiation: "bg-indigo-500/10 text-indigo-600",
    closed_won: "bg-emerald-500/10 text-emerald-600",
    closed_lost: "bg-rose-500/10 text-rose-600",
};

export default function OpportunitiesPage() {
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOpportunities = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/opportunities");
            if (!res.ok) throw new Error("Failed to fetch opportunities");
            const data = await res.json();
            setOpportunities(data.opportunities || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load opportunities");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const filteredOpportunities = opportunities.filter(opp => {
        const q = search.toLowerCase();
        const matchesSearch = opp.title.toLowerCase().includes(q) ||
            opp.company?.name.toLowerCase().includes(q) ||
            opp.contact?.first_name.toLowerCase().includes(q) ||
            opp.contact?.last_name.toLowerCase().includes(q);
        const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
        return matchesSearch && matchesStage;
    });

    return (
        <DashboardPage>
            <DashboardHeader
                title="Opportunities"
                subtitle="Track your sales pipeline and deals."
            >
                <Button className="rounded-full px-6 shrink-0">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Opportunity
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search opportunities..."
                        className="pl-9 rounded-xl border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {stageFilters.map(s => (
                        <button
                            key={s}
                            onClick={() => setStageFilter(s)}
                            className={cn(
                                filterPillBase,
                                stageFilter === s ? filterPillActive : filterPillInactive
                            )}
                        >
                            {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </button>
                    ))}
                </div>
            </DashboardControls>

            <div className="w-full overflow-x-auto">
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Company</th>
                            <th className={tableHeadCell + " px-4"}>Value</th>
                            <th className={tableHeadCell + " px-4"}>Stage</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Probability</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Close Date</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">Loading opportunities...</td>
                            </tr>
                        ) : filteredOpportunities.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No opportunities found.</td>
                            </tr>
                        ) : (
                            filteredOpportunities.map((opp) => (
                                <tr key={opp.id} className={tableRow + " group cursor-pointer"}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <span className="font-semibold text-sm truncate max-w-[200px] block">{opp.title}</span>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                        {opp.company?.name || "—"}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <span className="font-bold text-sm">${opp.value.toLocaleString()}</span>
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "rounded-full px-2 py-0 text-[10px] uppercase tracking-wider font-bold border-0",
                                                stageColors[opp.stage] || ""
                                            )}
                                        >
                                            {opp.stage.replace(/_/g, " ")}
                                        </Badge>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${opp.probability || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground">{opp.probability || 0}%</span>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {opp.expected_close_date
                                            ? new Date(opp.expected_close_date).toLocaleDateString()
                                            : "—"}
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
