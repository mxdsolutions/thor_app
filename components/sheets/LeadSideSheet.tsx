"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { createClient } from "@/lib/supabase/client";
import { useProfiles, useStatusConfig } from "@/lib/swr";
import { DEFAULT_LEAD_STAGES, toStatusConfig, hasBehavior } from "@/lib/status-config";

type Lead = {
    id: string;
    title: string;
    stage: string;
    value: number;
    probability: number | null;
    expected_close_date: string | null;
    description?: string | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    company?: { id: string; name: string } | null;
    assignee?: { id: string; full_name: string } | null;
    created_at: string;
};

type LineItem = {
    id: string;
    lead_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product: { id: string; name: string } | null;
    created_at: string;
};

type Service = {
    id: string;
    name: string;
    initial_value: number | null;
};

interface LeadSideSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    onStageChange?: (lead: Lead, newStage: string) => void;
}

// Stage config is loaded dynamically from tenant config

/** Side sheet for viewing/editing lead details, line items, and stage management. */
export function LeadSideSheet({ lead, open, onOpenChange, onUpdate, onStageChange }: LeadSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Lead | null>(lead);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const { data: stageData } = useStatusConfig("lead");
    const stageConfig = toStatusConfig(stageData?.statuses ?? DEFAULT_LEAD_STAGES);
    const stages = stageData?.statuses ?? DEFAULT_LEAD_STAGES;
    const { data: profilesData } = useProfiles();
    const users: { value: string; label: string }[] = useMemo(() =>
        (profilesData?.users || []).map((u: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
            value: u.id,
            label: u.user_metadata?.full_name || u.email || u.id,
        })),
        [profilesData]
    );

    useEffect(() => { setData(lead); }, [lead]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("products").select("id, name, initial_value").eq("status", "active").then(({ data: prods }) => {
            if (prods) setServices(prods);
        });
    }, []);

    const fetchLineItems = useCallback(async (leadId: string) => {
        const res = await fetch(`/api/lead-line-items?lead_id=${leadId}`);
        if (res.ok) {
            const { lineItems: items } = await res.json();
            setLineItems(items || []);
        }
    }, []);

    useEffect(() => {
        if (data?.id) fetchLineItems(data.id);
    }, [data?.id, fetchLineItems]);

    const handleAddLineItem = async (productId: string, quantity: number, unitPrice: number) => {
        if (!data) return;
        const res = await fetch("/api/lead-line-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_id: data.id, product_id: productId, quantity, unit_price: unitPrice }),
        });
        if (res.ok) {
            const { lineItem, leadValue } = await res.json();
            setLineItems((prev) => [...prev, lineItem]);
            setData((prev) => prev ? { ...prev, value: leadValue } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to add service");
        }
    };

    const handleUpdateLineItem = async (id: string, field: "quantity" | "unit_price", value: number) => {
        const res = await fetch("/api/lead-line-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, [field]: value }),
        });
        if (res.ok) {
            const { lineItem, leadValue } = await res.json();
            setLineItems((prev) => prev.map((li) => li.id === id ? lineItem : li));
            setData((prev) => prev ? { ...prev, value: leadValue } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update");
        }
    };

    const handleDeleteLineItem = async (id: string) => {
        const res = await fetch(`/api/lead-line-items?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            const { leadValue } = await res.json();
            setLineItems((prev) => prev.filter((li) => li.id !== id));
            setData((prev) => prev ? { ...prev, value: leadValue } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to remove service");
        }
    };

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("leads")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            const updated = { ...data, [column]: value };
            setData(updated);
            onUpdate?.();
            if (column === "stage" && hasBehavior(stages, value as string, "trigger_job_creation")) {
                onStageChange?.(updated, value as string);
            }
        }
    }, [data, onUpdate, onStageChange]);

    if (!data) return null;

    const stage = stageConfig[data.stage] || stageConfig.appt_booked;

    const probabilityColor = (p: number) => {
        if (p >= 70) return "bg-emerald-500";
        if (p >= 40) return "bg-amber-400";
        return "bg-rose-400";
    };

    const tabs = [
        { id: "details", label: "Details" },
        { id: "services", label: `Services (${lineItems.length})` },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<span className="text-lg font-bold text-emerald-600">$</span>}
            iconBg="bg-emerald-500/10"
            title={data.title}
            subtitle={`$${data.value.toLocaleString()}${data.probability != null ? ` · ${data.probability}% probability` : ""}`}
            badge={{ label: stage.label, dotColor: stage.color }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    {/* Value hero card */}
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-baseline justify-between mb-3">
                            <span className="text-2xl font-bold tabular-nums text-foreground">
                                ${data.value.toLocaleString()}
                            </span>
                            {data.probability != null && (
                                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                                    {data.probability}%
                                </span>
                            )}
                        </div>
                        {data.probability != null && (
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all", probabilityColor(data.probability))}
                                    style={{ width: `${data.probability}%` }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "Title", value: data.title, dbColumn: "title", type: "text", rawValue: data.title },
                                { label: "Stage", value: stage.label, dbColumn: "stage", type: "select", rawValue: data.stage, options: Object.entries(stageConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                                { label: "Value", value: `$${data.value.toLocaleString()}`, dbColumn: "value", type: "number", rawValue: data.value },
                                { label: "Probability", value: data.probability != null ? `${data.probability}%` : null, dbColumn: "probability", type: "number", rawValue: data.probability },
                                { label: "Expected Close", value: data.expected_close_date ? new Date(data.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null, dbColumn: "expected_close_date", type: "date", rawValue: data.expected_close_date },
                                { label: "Assigned To", value: data.assignee?.full_name, dbColumn: "assigned_to", type: "select", rawValue: data.assignee?.id ?? null, options: users },
                                { label: "Created", value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                            ]}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "Description", value: data.description || null, dbColumn: "description", type: "text", rawValue: data.description },
                            ]}
                        />
                    </div>

                    {data.contact && (
                        <LinkedEntityCard
                            label="Contact"
                            title={`${data.contact.first_name} ${data.contact.last_name}`}
                            icon={<span className="text-[9px] font-bold text-muted-foreground">{data.contact.first_name[0]}{data.contact.last_name[0]}</span>}
                        />
                    )}

                    {data.company && (
                        <LinkedEntityCard
                            label="Company"
                            title={data.company.name}
                            icon={<span className="text-[10px] font-bold text-muted-foreground">{data.company.name[0]}</span>}
                        />
                    )}
                </div>
            )}

            {activeTab === "services" && (
                <LineItemsTable
                    mode="live"
                    items={lineItems}
                    services={services}
                    onAdd={handleAddLineItem}
                    onUpdate={handleUpdateLineItem}
                    onDelete={handleDeleteLineItem}
                />
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="lead" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="lead" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
