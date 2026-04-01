"use client";

import { useState } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn, getContactInitials, timeAgo } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { LeadSideSheet } from "@/components/sheets/LeadSideSheet";
import { toast } from "sonner";
import { useLeads } from "@/lib/swr";

type Lead = {
    id: string;
    title: string;
    source: string | null;
    status: string;
    priority: string;
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

const statusColumns = [
    { id: "new", label: "New", color: "bg-blue-500" },
    { id: "contacted", label: "Contacted", color: "bg-amber-500" },
    { id: "qualified", label: "Qualified", color: "bg-emerald-500" },
    { id: "unqualified", label: "Unqualified", color: "bg-rose-400" },
    { id: "converted", label: "Converted", color: "bg-violet-500" },
];

const priorityConfig: Record<string, { dot: string; label: string }> = {
    low: { dot: "bg-slate-300", label: "Low" },
    medium: { dot: "bg-amber-400", label: "Med" },
    high: { dot: "bg-rose-500", label: "High" },
};


export default function LeadsPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading: loading, mutate } = useLeads();
    const leads: Lead[] = data?.leads || [];
    const [showCreate, setShowCreate] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const fetchLeads = () => mutate();

    const filteredLeads = leads.filter(lead => {
        const q = search.toLowerCase();
        return lead.title.toLowerCase().includes(q) ||
            lead.contact?.first_name.toLowerCase().includes(q) ||
            lead.contact?.last_name.toLowerCase().includes(q) ||
            lead.company?.name.toLowerCase().includes(q);
    });

    return (
        <DashboardPage>
            <DashboardHeader
                title="Leads"
                subtitle="Track and manage your sales leads."
            >
                <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
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
            </DashboardControls>

            <Kanban
                items={filteredLeads}
                columns={statusColumns}
                getItemStatus={(lead) => lead.status}
                loading={loading}
                onCardClick={(lead) => setSelectedLead(lead)}
                onItemMove={async (itemId, _from, to, label) => {
                    // Optimistic update
                    mutate(
                        (current: any) => current ? { ...current, leads: current.leads.map((l: Lead) => l.id === itemId ? { ...l, status: to } : l) } : current,
                        { revalidate: false }
                    );
                    try {
                        const res = await fetch("/api/leads", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: itemId, status: to }),
                        });
                        if (!res.ok) throw new Error();
                        toast.success(`Moved to ${label}`);
                    } catch {
                        mutate(); // Revert by refetching
                        toast.error("Failed to update status");
                    }
                }}
                renderCard={(lead) => {
                    const priority = priorityConfig[lead.priority] || priorityConfig.low;
                    return (
                        <div className="space-y-3">
                            {/* Title */}
                            <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-foreground">
                                {lead.title}
                            </p>

                            {/* Contact + Company */}
                            {(lead.contact || lead.company) && (
                                <div className="flex items-center gap-2.5">
                                    {lead.contact && (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <span className="text-[9px] font-bold text-muted-foreground">
                                                {getContactInitials(lead.contact.first_name, lead.contact.last_name)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        {lead.contact && (
                                            <p className="text-xs font-medium text-foreground/80 truncate leading-tight">
                                                {lead.contact.first_name} {lead.contact.last_name}
                                            </p>
                                        )}
                                        {lead.company && (
                                            <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                                {lead.company.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Footer: Value + Meta */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                <div className="flex items-center gap-2">
                                    {lead.source && (
                                        <span className="text-[10px] text-muted-foreground/70 capitalize">
                                            {lead.source}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", priority.dot)} />
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                        {timeAgo(lead.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }}
            />

            <CreateLeadModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchLeads()}
            />

            <LeadSideSheet
                lead={selectedLead}
                open={!!selectedLead}
                onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
            />
        </DashboardPage>
    );
}
