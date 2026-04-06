"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardControls } from "@/components/dashboard/DashboardPage";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import { usePageTitle } from "@/lib/page-title-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kanban } from "@/components/Kanban";
import { cn, getContactInitials } from "@/lib/utils";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    Squares2X2Icon,
    ListBulletIcon,
} from "@heroicons/react/24/outline";
import { TableSkeleton } from "@/components/ui/skeleton";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { ClosedWonJobModal } from "@/components/modals/ClosedWonJobModal";
import { CreateJobFromLeadModal } from "@/components/modals/CreateJobFromLeadModal";
import { LeadSideSheet } from "@/components/sheets/LeadSideSheet";
import { useLeads, useStatusConfig } from "@/lib/swr";
import { useKanbanPage } from "@/lib/hooks/use-kanban-page";
import { DEFAULT_LEAD_STAGES, toKanbanColumns, hasBehavior } from "@/lib/status-config";

type Lead = {
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

// Stage columns are loaded dynamically from tenant config

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

export default function LeadsPage() {
    return (
        <Suspense>
            <LeadsPageContent />
        </Suspense>
    );
}

function LeadsPageContent() {
    usePageTitle("Leads");
    const searchParams = useSearchParams();
    const { data: stageData } = useStatusConfig("lead");
    const stages = stageData?.statuses ?? DEFAULT_LEAD_STAGES;
    const stageColumns = toKanbanColumns(stages);
    const leadsHook = useLeads();
    const { search, setSearch, items, filteredItems: filteredLeads, isLoading: loading, handleMove, refresh: fetchLeads } = useKanbanPage<Lead>({
        swr: leadsHook,
        endpoint: "/api/leads",
        statusField: "stage",
        searchFilter: (opp, q) =>
            opp.title.toLowerCase().includes(q) ||
            opp.company?.name.toLowerCase().includes(q) ||
            opp.contact?.first_name.toLowerCase().includes(q) ||
            opp.contact?.last_name.toLowerCase().includes(q) || false,
    });
    const [showCreate, setShowCreate] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [closedWonLead, setClosedWonLead] = useState<Lead | null>(null);
    const [showCreateJob, setShowCreateJob] = useState(false);
    const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
    const [view, setView] = useState<"table" | "kanban">("table");
    const router = useRouter();

    // Handle deep-link open from URL params
    useEffect(() => {
        if (!leadsHook.data?.items) return;
        const openId = pendingOpenId || searchParams.get("open");
        if (openId) {
            const lead = items.find((o: Lead) => o.id === openId);
            if (lead) {
                setSelectedLead(lead);
            }
            setPendingOpenId(null);
        }
    }, [leadsHook.data, searchParams, pendingOpenId, items]);

    return (
        <>
            <ScrollableTableLayout
                header={
                    <DashboardControls>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search leads..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-1 p-1 rounded-full bg-secondary">
                                <button
                                    onClick={() => setView("kanban")}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Kanban view"
                                >
                                    <Squares2X2Icon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("table")}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        view === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Table view"
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Lead
                        </Button>
                    </DashboardControls>
                }
            >
                {view === "kanban" ? (
                    <Kanban
                items={filteredLeads}
                columns={stageColumns}
                getItemStatus={(opp) => opp.stage}
                loading={loading}
                onCardClick={(opp) => setSelectedLead(opp)}
                onItemMove={async (itemId, from, to, label) => {
                    await handleMove(itemId, from, to, label);
                    if (hasBehavior(stages, to, "trigger_job_creation")) {
                        const opp = items.find(o => o.id === itemId);
                        if (opp) setClosedWonLead({ ...opp, stage: to });
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
                ) : (
                    <table className={tableBase + " border-collapse min-w-full"}>
                        <thead className={tableHead + " sticky top-0 z-10"}>
                            <tr>
                                <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Title</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Company</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Contact</th>
                                <th className={tableHeadCell + " px-4 text-right sm:text-left"}>Value</th>
                                <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Stage</th>
                                <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 hidden sm:table-cell"}>Close Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton rows={8} columns={6} />
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No leads found.</td>
                                </tr>
                            ) : (
                                filteredLeads.map((opp) => {
                                    const stageCol = stageColumns.find(c => c.id === opp.stage);
                                    return (
                                        <tr key={opp.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedLead(opp)}>
                                            <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                                <span className="font-semibold text-sm truncate max-w-[200px] block">{opp.title}</span>
                                            </td>
                                            <td className={tableCellMuted + " px-4 hidden sm:table-cell truncate max-w-[150px]"}>
                                                {opp.company?.name || "—"}
                                            </td>
                                            <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                                {opp.contact ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-border/50">
                                                            {getContactInitials(opp.contact.first_name, opp.contact.last_name)}
                                                        </div>
                                                        <span className="text-sm truncate">{opp.contact.first_name} {opp.contact.last_name}</span>
                                                    </div>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className={tableCell + " px-4 text-right sm:text-left"}>
                                                <span className="font-bold text-sm">${(opp.value ?? 0).toLocaleString()}</span>
                                            </td>
                                            <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageCol?.color || "#94a3b8" }} />
                                                    <span className="text-xs font-medium text-muted-foreground">{stageCol?.label || opp.stage}</span>
                                                </div>
                                            </td>
                                            <td className={tableCellMuted + " pl-4 pr-4 md:pr-6 lg:pr-10 hidden sm:table-cell"}>
                                                {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : "—"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </ScrollableTableLayout>

            <CreateLeadModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchLeads()}
            />

            <LeadSideSheet
                lead={selectedLead}
                open={!!selectedLead}
                onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
                onUpdate={fetchLeads}
                onStageChange={(lead, newStage) => {
                    if (hasBehavior(stages, newStage, "trigger_job_creation")) {
                        setClosedWonLead(lead);
                    }
                }}
            />

            <ClosedWonJobModal
                open={!!closedWonLead && !showCreateJob}
                onOpenChange={(open) => { if (!open) setClosedWonLead(null); }}
                leadTitle={closedWonLead?.title || ""}
                onConfirm={() => setShowCreateJob(true)}
                onSkip={() => setClosedWonLead(null)}
            />

            {closedWonLead && (
                <CreateJobFromLeadModal
                    open={showCreateJob}
                    onOpenChange={(open) => { if (!open) { setShowCreateJob(false); setClosedWonLead(null); } }}
                    leadId={closedWonLead.id}
                    leadTitle={closedWonLead.title}
                    companyId={closedWonLead.company?.id || closedWonLead.company_id || null}
                    companyName={closedWonLead.company?.name || null}
                    onCreated={(job) => {
                        setShowCreateJob(false);
                        setClosedWonLead(null);
                        router.push(`/dashboard/jobs?open=${job.id}`);
                    }}
                />
            )}
        </>
    );
}
