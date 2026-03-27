"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";

type Opportunity = {
    id: string;
    title: string;
    stage: string;
    value: number;
    probability: number | null;
    expected_close_date: string | null;
    description?: string | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    company?: { id: string; name: string } | null;
    lead?: { id: string; title: string } | null;
    assignee?: { id: string; full_name: string } | null;
    created_at: string;
};

interface OpportunitySideSheetProps {
    opportunity: Opportunity | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const stageConfig: Record<string, { label: string; color: string }> = {
    appt_booked: { label: "Appt Booked", color: "bg-blue-500" },
    proposal_sent: { label: "Proposal Sent", color: "bg-amber-500" },
    negotiation: { label: "Negotiation", color: "bg-indigo-500" },
    closed_won: { label: "Closed Won", color: "bg-emerald-500" },
    closed_lost: { label: "Closed Lost", color: "bg-rose-400" },
};

export function OpportunitySideSheet({ opportunity, open, onOpenChange }: OpportunitySideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        if (opportunity?.id) setActiveTab("details");
    }, [opportunity?.id]);

    if (!opportunity) return null;

    const stage = stageConfig[opportunity.stage] || stageConfig.appt_booked;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    const probabilityColor = (p: number) => {
        if (p >= 70) return "bg-emerald-500";
        if (p >= 40) return "bg-amber-400";
        return "bg-rose-400";
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-lg font-bold text-emerald-600">$</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-lg font-bold truncate">{opportunity.title}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", stage.color)} />
                                    {stage.label}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                ${opportunity.value.toLocaleString()}
                                {opportunity.probability != null && ` · ${opportunity.probability}% probability`}
                            </SheetDescription>
                        </div>
                    </SheetHeader>
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background">
                        <div className="flex gap-6 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === "details" && (
                            <div className="space-y-4">
                                {/* Value hero card */}
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <div className="flex items-baseline justify-between mb-3">
                                        <span className="text-2xl font-bold tabular-nums text-foreground">
                                            ${opportunity.value.toLocaleString()}
                                        </span>
                                        {opportunity.probability != null && (
                                            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                                                {opportunity.probability}%
                                            </span>
                                        )}
                                    </div>
                                    {opportunity.probability != null && (
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", probabilityColor(opportunity.probability))}
                                                style={{ width: `${opportunity.probability}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields fields={[
                                        { label: "Stage", value: stage.label },
                                        { label: "Expected Close", value: opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null },
                                        { label: "Assigned To", value: opportunity.assignee?.full_name },
                                        { label: "Created", value: new Date(opportunity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                                    ]} />
                                </div>

                                {opportunity.description && (
                                    <div className="rounded-xl border border-border bg-card p-5">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">Description</p>
                                        <p className="text-sm text-foreground leading-relaxed">{opportunity.description}</p>
                                    </div>
                                )}

                                {opportunity.lead && (
                                    <LinkedEntityCard
                                        label="Related Lead"
                                        title={opportunity.lead.title}
                                        icon={
                                            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                            </svg>
                                        }
                                    />
                                )}

                                {opportunity.contact && (
                                    <LinkedEntityCard
                                        label="Contact"
                                        title={`${opportunity.contact.first_name} ${opportunity.contact.last_name}`}
                                        icon={
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {opportunity.contact.first_name[0]}{opportunity.contact.last_name[0]}
                                            </span>
                                        }
                                    />
                                )}

                                {opportunity.company && (
                                    <LinkedEntityCard
                                        label="Company"
                                        title={opportunity.company.name}
                                        icon={
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {opportunity.company.name[0]}
                                            </span>
                                        }
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="opportunity" entityId={opportunity.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="opportunity" entityId={opportunity.id} />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
