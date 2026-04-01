"use client";

import { useState, useEffect, useCallback } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { CreateOpportunityFromLeadModal } from "@/components/modals/CreateOpportunityFromLeadModal";
import { Button } from "@/components/ui/button";

type Lead = {
    id: string;
    title: string;
    source: string | null;
    status: string;
    priority: string;
    description?: string | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    company?: { id: string; name: string } | null;
    assignee?: { id: string; full_name: string } | null;
    opportunity?: { id: string; title: string } | null;
    opportunity_id?: string | null;
    created_at: string;
};

interface LeadSideSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
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

export function LeadSideSheet({ lead, open, onOpenChange, onUpdate }: LeadSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Lead | null>(lead);
    const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
    const [showCreateOpp, setShowCreateOpp] = useState(false);

    useEffect(() => {
        setData(lead);
    }, [lead]);

    useEffect(() => {
        if (data?.id) setActiveTab("details");
    }, [data?.id]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("profiles").select("id, full_name, email").then(({ data: profiles }) => {
            if (profiles) setUsers(profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || p.id })));
        });
    }, []);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("leads")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    if (!data) return null;

    const status = statusConfig[data.status] || statusConfig.new;
    const priority = priorityConfig[data.priority] || priorityConfig.medium;
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
                                <SheetTitle className="text-lg font-bold truncate">{data.title}</SheetTitle>
                                <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                    <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status.color)} />
                                    {status.label}
                                </Badge>
                            </div>
                            <SheetDescription className="text-sm text-muted-foreground mt-1">
                                {data.company?.name || "No company"}
                            </SheetDescription>
                            {!data.opportunity_id && !data.opportunity && (
                                <Button
                                    size="sm"
                                    className="rounded-full mt-2 h-7 text-xs px-3"
                                    onClick={() => setShowCreateOpp(true)}
                                >
                                    Create Opportunity
                                </Button>
                            )}
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
                                    <DetailFields
                                        onSave={handleSave}
                                        fields={[
                                            {
                                                label: "Title",
                                                value: data.title,
                                                dbColumn: "title",
                                                type: "text",
                                                rawValue: data.title,
                                            },
                                            {
                                                label: "Status",
                                                value: status.label,
                                                dbColumn: "status",
                                                type: "select",
                                                rawValue: data.status,
                                                options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
                                            },
                                            {
                                                label: "Priority",
                                                value: (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", priority.color)} />
                                                        {priority.label}
                                                    </span>
                                                ),
                                                dbColumn: "priority",
                                                type: "select",
                                                rawValue: data.priority,
                                                options: Object.entries(priorityConfig).map(([k, v]) => ({ value: k, label: v.label })),
                                            },
                                            {
                                                label: "Source",
                                                value: data.source ? data.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null,
                                                dbColumn: "source",
                                                type: "select",
                                                rawValue: data.source,
                                                options: [
                                                    { value: "website", label: "Website" },
                                                    { value: "referral", label: "Referral" },
                                                    { value: "cold_call", label: "Cold Call" },
                                                    { value: "social_media", label: "Social Media" },
                                                    { value: "email", label: "Email" },
                                                    { value: "other", label: "Other" },
                                                ],
                                            },
                                            {
                                                label: "Assigned To",
                                                value: data.assignee?.full_name,
                                                dbColumn: "assigned_to",
                                                type: "select",
                                                rawValue: data.assignee?.id ?? null,
                                                options: users,
                                            },
                                            {
                                                label: "Created",
                                                value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                            },
                                        ]}
                                    />
                                </div>

                                {/* Description - editable */}
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <DetailFields
                                        onSave={handleSave}
                                        fields={[
                                            {
                                                label: "Description",
                                                value: data.description || null,
                                                dbColumn: "description",
                                                type: "text",
                                                rawValue: data.description,
                                            },
                                        ]}
                                    />
                                </div>

                                {data.contact && (
                                    <LinkedEntityCard
                                        label="Contact"
                                        title={`${data.contact.first_name} ${data.contact.last_name}`}
                                        icon={
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {data.contact.first_name[0]}{data.contact.last_name[0]}
                                            </span>
                                        }
                                    />
                                )}

                                {data.company && (
                                    <LinkedEntityCard
                                        label="Company"
                                        title={data.company.name}
                                        icon={
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {data.company.name[0]}
                                            </span>
                                        }
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesPanel entityType="lead" entityId={data.id} />
                        )}

                        {activeTab === "activity" && (
                            <ActivityTimeline entityType="lead" entityId={data.id} />
                        )}
                    </div>
                </div>
            </SheetContent>

            <CreateOpportunityFromLeadModal
                open={showCreateOpp}
                onOpenChange={setShowCreateOpp}
                leadId={data.id}
                companyId={data.company?.id ?? null}
                companyName={data.company?.name ?? null}
                onCreated={() => onUpdate?.()}
            />
        </Sheet>
    );
}
