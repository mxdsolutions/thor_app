"use client";

import { useState, useRef, useEffect } from "react";
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
    FunnelIcon
} from "@heroicons/react/24/outline";
import { ContentModal } from "@/components/dashboard/ContentModal";

const contentItems = [
    { id: "C1", name: "Welcome Guide", sku: "WG-001", category: "Article", targetAudience: "Admin", status: "Active" },
    { id: "C2", name: "Safety Procedures", sku: "SP-002", category: "Document", targetAudience: "Both", status: "Draft" },
    { id: "C3", name: "Pricing Tiers", sku: "PT-003", category: "Page", targetAudience: "Member", status: "Active" },
    { id: "C4", name: "Terms of Service", sku: "TOS-004", category: "Policy", targetAudience: "Both", status: "Active" },
    { id: "C5", name: "Help Center", sku: "HC-005", category: "Support", targetAudience: "Member", status: "Active" },
];

export default function ContentPage() {
    const [search, setSearch] = useState("");
    const [contentOpen, setContentOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [targetFilter, setTargetFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setFilterOpen(false);
            }
        }

        if (filterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [filterOpen]);

    const filteredContent = contentItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
        const matchesTarget = targetFilter === "All" || item.targetAudience === targetFilter || item.targetAudience === "Both";
        const matchesStatus = statusFilter === "All" || item.status === statusFilter;
        return matchesSearch && matchesTarget && matchesStatus;
    });

    return (
        <>
            <ContentModal open={contentOpen} onClose={() => setContentOpen(false)} />

            <DashboardPage>
                <DashboardHeader
                    title="Content"
                    subtitle="Manage articles, documents, and pages."
                >
                    <Button
                        className="rounded-full px-6 shrink-0"
                        onClick={() => setContentOpen(true)}
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Content
                    </Button>
                </DashboardHeader>

                <DashboardControls>
                    <div className="flex w-full gap-3 max-w-sm relative">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search content or ID..."
                                className="pl-9 rounded-xl border-border/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative" ref={filterRef}>
                            <Button
                                variant="outline"
                                className="rounded-[12px] px-3 border-border/50"
                                onClick={() => setFilterOpen(!filterOpen)}
                            >
                                <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                            </Button>

                            {filterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-background border border-border/50 shadow-xl rounded-2xl z-20">
                                    <div className="space-y-5">
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold">Target Audience</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {["All", "Admin", "Member"].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTargetFilter(t)}
                                                        className={cn(
                                                            filterPillBase,
                                                            targetFilter === t
                                                                ? filterPillActive
                                                                : filterPillInactive
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold">Status</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {["All", "Active", "Draft"].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setStatusFilter(s)}
                                                        className={cn(
                                                            filterPillBase,
                                                            statusFilter === s
                                                                ? filterPillActive
                                                                : filterPillInactive
                                                        )}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DashboardControls>

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>ID</th>
                                <th className={tableHeadCell + " px-4"}>Category</th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Access</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContent.map((item) => (
                                <tr key={item.id} className={tableRow + " group cursor-pointer"}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground/50 border border-border/50 shrink-0">
                                                {item.id}
                                            </div>
                                            <span className="font-semibold text-sm truncate">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {item.sku}
                                    </td>
                                    <td className={tableCell + " px-4"}>
                                        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium border-border/50">
                                            {item.category}
                                        </Badge>
                                    </td>
                                    <td className={tableCell + " px-4 text-right sm:text-left"}>
                                        <span className="font-bold text-sm">Public</span>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                            <span className="text-xs font-medium text-muted-foreground">{item.status}</span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DashboardPage>
        </>
    );
}
