"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn, getContactInitials } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { CreateOpportunityModal } from "@/components/modals/CreateOpportunityModal";
import { ClosedWonJobModal } from "@/components/modals/ClosedWonJobModal";
import { CreateJobFromOpportunityModal } from "@/components/modals/CreateJobFromOpportunityModal";
import { OpportunitySideSheet } from "@/components/sheets/OpportunitySideSheet";
import { toast } from "sonner";
import { useOpportunities } from "@/lib/swr";

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
    company_id?: string | null;
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
    const { data, isLoading: loading, mutate } = useOpportunities();
    const opportunities: Opportunity[] = data?.opportunities || [];
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [closedWonOpp, setClosedWonOpp] = useState<Opportunity | null>(null);
    const [showCreateJob, setShowCreateJob] = useState(false);
    const router = useRouter();

    const fetchOpportunities = () => mutate();

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
                    mutate(
                        (current: any) => current ? { ...current, opportunities: current.opportunities.map((o: Opportunity) => o.id === itemId ? { ...o, stage: to } : o) } : current,
                        { revalidate: false }
                    );
                    try {
                        const res = await fetch("/api/opportunities", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: itemId, stage: to }),
                        });
                        if (!res.ok) throw new Error();
                        toast.success(`Moved to ${label}`);

                        // Trigger closed won flow
                        if (to === "closed_won") {
                            const opp = opportunities.find(o => o.id === itemId);
                            if (opp) setClosedWonOpp({ ...opp, stage: to });
                        }
                    } catch {
                        mutate();
                        toast.error("Failed to update stage");
                    }
                }}
                renderCard={(opp) => {
                    const closeInfo = opp.expected_close_date
                        ? formatCloseDate(opp.expected_close_date)
                        : null;

                    return (
                        <div className="space-y-2.5">
                            {/* Title */}
                            <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-foreground">
                                {opp.title}
                            </p>

                            {/* Value · Company */}
                            <div className="flex items-center gap-0 text-[12px]">
                                <span className="font-bold tabular-nums text-foreground">
                                    ${opp.value.toLocaleString()}
                                </span>
                                {opp.company && (
                                    <>
                                        <span className="text-muted-foreground mx-1.5">·</span>
                                        <span className="text-muted-foreground truncate">
                                            {opp.company.name}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Probability */}
                            {opp.probability != null && (
                                <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                probabilityColor(opp.probability)
                                            )}
                                            style={{ width: `${opp.probability}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                                        {opp.probability}%
                                    </span>
                                </div>
                            )}

                            {/* Contact avatar + close date footer */}
                            <div className="flex items-center justify-between pt-1">
                                {opp.contact ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 ring-2 ring-background">
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {getContactInitials(opp.contact.first_name, opp.contact.last_name)}
                                            </span>
                                        </div>
                                    </div>
                                ) : <div />}
                                {closeInfo && (
                                    <span className={cn(
                                        "text-[11px] font-medium",
                                        closeInfo.urgent ? "text-rose-500" : "text-muted-foreground"
                                    )}>
                                        {closeInfo.text}
                                        {closeInfo.label && ` · ${closeInfo.label}`}
                                    </span>
                                )}
                            </div>
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
                onUpdate={fetchOpportunities}
                onStageChange={(opp, newStage) => {
                    if (newStage === "closed_won") {
                        setClosedWonOpp(opp);
                    }
                }}
            />

            <ClosedWonJobModal
                open={!!closedWonOpp && !showCreateJob}
                onOpenChange={(open) => { if (!open) setClosedWonOpp(null); }}
                opportunityTitle={closedWonOpp?.title || ""}
                onConfirm={() => setShowCreateJob(true)}
                onSkip={() => setClosedWonOpp(null)}
            />

            {closedWonOpp && (
                <CreateJobFromOpportunityModal
                    open={showCreateJob}
                    onOpenChange={(open) => { if (!open) { setShowCreateJob(false); setClosedWonOpp(null); } }}
                    opportunityId={closedWonOpp.id}
                    opportunityTitle={closedWonOpp.title}
                    companyId={closedWonOpp.company?.id || closedWonOpp.company_id || null}
                    companyName={closedWonOpp.company?.name || null}
                    onCreated={(job) => {
                        setShowCreateJob(false);
                        setClosedWonOpp(null);
                        router.push(`/dashboard/operations/jobs?open=${job.id}`);
                    }}
                />
            )}
        </DashboardPage>
    );
}
