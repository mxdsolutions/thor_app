"use client";

import { useState, useEffect } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn, getContactInitials } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { CreateOpportunityModal } from "@/components/modals/CreateOpportunityModal";
import { OpportunitySideSheet } from "@/components/sheets/OpportunitySideSheet";
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

const stageColumns = [
    { id: "appt_booked", label: "Appt Booked", color: "bg-blue-500" },
    { id: "proposal_sent", label: "Proposal Sent", color: "bg-amber-500" },
    { id: "negotiation", label: "Negotiation", color: "bg-indigo-500" },
    { id: "closed_won", label: "Closed Won", color: "bg-emerald-500" },
    { id: "closed_lost", label: "Closed Lost", color: "bg-rose-400" },
];

const probabilityColor = (p: number) => {
    if (p >= 70) return "bg-emerald-500";
    if (p >= 40) return "bg-amber-400";
    return "bg-rose-400";
};

function formatCloseDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / 86400000);

    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (days < 0) return { text: formatted, urgent: true, label: "Overdue" };
    if (days <= 7) return { text: formatted, urgent: true, label: `${days}d left` };
    if (days <= 30) return { text: formatted, urgent: false, label: `${days}d left` };
    return { text: formatted, urgent: false, label: null };
}

export default function OpportunitiesPage() {
    const [search, setSearch] = useState("");
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

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
        return opp.title.toLowerCase().includes(q) ||
            opp.company?.name.toLowerCase().includes(q) ||
            opp.contact?.first_name.toLowerCase().includes(q) ||
            opp.contact?.last_name.toLowerCase().includes(q);
    });

    return (
        <DashboardPage>
            <DashboardHeader
                title="Opportunities"
                subtitle="Track your sales pipeline and deals."
            >
                <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
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
            </DashboardControls>

            <Kanban
                items={filteredOpportunities}
                columns={stageColumns}
                getItemStatus={(opp) => opp.stage}
                loading={loading}
                onCardClick={(opp) => setSelectedOpp(opp)}
                onItemMove={async (itemId, _from, to, label) => {
                    setOpportunities(prev => prev.map(o => o.id === itemId ? { ...o, stage: to } : o));
                    try {
                        const res = await fetch("/api/opportunities", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: itemId, stage: to }),
                        });
                        if (!res.ok) throw new Error();
                        toast.success(`Moved to ${label}`);
                    } catch {
                        setOpportunities(prev => prev.map(o => o.id === itemId ? { ...o, stage: _from } : o));
                        toast.error("Failed to update stage");
                    }
                }}
                renderCard={(opp) => {
                    const closeInfo = opp.expected_close_date
                        ? formatCloseDate(opp.expected_close_date)
                        : null;

                    return (
                        <div className="space-y-3">
                            {/* Value — the hero number */}
                            <div className="flex items-baseline justify-between">
                                <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                                    ${opp.value.toLocaleString()}
                                </span>
                                {opp.probability != null && (
                                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                                        {opp.probability}%
                                    </span>
                                )}
                            </div>

                            {/* Probability bar */}
                            {opp.probability != null && (
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            probabilityColor(opp.probability)
                                        )}
                                        style={{ width: `${opp.probability}%` }}
                                    />
                                </div>
                            )}

                            {/* Title */}
                            <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-foreground">
                                {opp.title}
                            </p>

                            {/* Contact + Company */}
                            {(opp.contact || opp.company) && (
                                <div className="flex items-center gap-2.5">
                                    {opp.contact && (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {getContactInitials(opp.contact.first_name, opp.contact.last_name)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        {opp.contact && (
                                            <p className="text-xs font-medium text-foreground/80 truncate leading-tight">
                                                {opp.contact.first_name} {opp.contact.last_name}
                                            </p>
                                        )}
                                        {opp.company && (
                                            <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                                {opp.company.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Footer: Close date */}
                            {closeInfo && (
                                <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                                    <CalendarDaysIcon className={cn(
                                        "w-3.5 h-3.5",
                                        closeInfo.urgent ? "text-rose-500" : "text-muted-foreground/60"
                                    )} />
                                    <span className={cn(
                                        "text-[11px] font-medium",
                                        closeInfo.urgent ? "text-rose-500" : "text-muted-foreground"
                                    )}>
                                        {closeInfo.text}
                                    </span>
                                    {closeInfo.label && (
                                        <span className={cn(
                                            "text-[10px] ml-auto font-semibold",
                                            closeInfo.urgent ? "text-rose-500" : "text-muted-foreground/60"
                                        )}>
                                            {closeInfo.label}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }}
            />

            <CreateOpportunityModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchOpportunities()}
            />

            <OpportunitySideSheet
                opportunity={selectedOpp}
                open={!!selectedOpp}
                onOpenChange={(open) => { if (!open) setSelectedOpp(null); }}
            />
        </DashboardPage>
    );
}
