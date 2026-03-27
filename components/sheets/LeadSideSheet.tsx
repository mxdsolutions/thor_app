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

type Lead = {
    id: string;
    title: string;
    source: string | null;
    status: string;
    priority: string;
    estimated_value: number | null;
    description?: string | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    company?: { id: string; name: string } | null;
    assignee?: { id: string; full_name: string } | null;
    created_at: string;
};

interface LeadSideSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: "New", color: "bg-blue-500" },
    contacted: { label: "Contacted", color: "bg-amber-500" },
    qualified: { label: "Qualified", color: "bg-emerald-500" },
    unqualified: { label: "Unqualified", color: "bg-rose-400" },
    converted: { label: "Converted", color: "bg-violet-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: "Low", color: "bg-slate-400" },
    medium: { label: "Medium", color: "bg-amber-400" },
    high: { label: "High", color: "bg-rose-500" },
};

export function LeadSideSheet({ lead, open, onOpenChange }: LeadSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        if (lead?.id) setActiveTab("details");
    }, [lead?.id]);

    if (!lead) return null;

    const status = statusConfig[lead.status] || statusConfig.new;
    const priority = priorityConfig[lead.priority] || priorityConfig.medium;
    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2.5">
                                <SheetTitle className="text-lg font-bold truncate">{lead.title}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status.color)} />
                                    {status.label}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                {lead.company?.name || "No company"} {lead.estimated_value ? `· $${lead.estimated_value.toLocaleString()}` : ""}
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
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields fields={[
                                        { label: "Status", value: status.label },
                                        { label: "Priority", value: (
                                            <span className="flex items-center gap-1.5">
                                                <span className={cn("w-1.5 h-1.5 rounded-full", priority.color)} />
                                                {priority.label}
                                            </span>
                                        )},
                                        { label: "Estimated Value", value: lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : null },
                                        { label: "Source", value: lead.source ? lead.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null },
                                        { label: "Assigned To", value: lead.assignee?.full_name },
                                        { label: "Created", value: new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                                    ]} />
                                </div>

                                {lead.description && (
                                    <div className="rounded-xl border border-border bg-card p-5">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">Description</p>
                                        <p className="text-sm text-foreground leading-relaxed">{lead.description}</p>
                                    </div>
                                )}

                                {lead.contact && (
                                    <LinkedEntityCard
                                        label="Contact"
                                        title={`${lead.contact.first_name} ${lead.contact.last_name}`}
                                        icon={
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {lead.contact.first_name[0]}{lead.contact.last_name[0]}
                                            </span>
                                        }
                                    />
                                )}

                                {lead.company && (
                                    <LinkedEntityCard
                                        label="Company"
                                        title={lead.company.name}
                                        icon={
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {lead.company.name[0]}
                                            </span>
                                        }
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="lead" entityId={lead.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="lead" entityId={lead.id} />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
