"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { createClient } from "@/lib/supabase/client";
import { IconCube as CubeIcon } from "@tabler/icons-react";

type Service = {
    id: string;
    name: string;
    description: string | null;
    initial_value: number | null;
    monthly_value: number | null;
    yearly_value: number | null;
    status: string;
    created_at: string;
};

interface ServiceSideSheetProps {
    service: Service | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function ServiceSideSheet({ service, open, onOpenChange, onUpdate }: ServiceSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Service | null>(service);

    useEffect(() => { setData(service); }, [service]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("products")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    if (!data) return null;

    const statusLabel = data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : "Active";

    const tabs = [
        { id: "details", label: "Details" },
        { id: "notes", label: "Notes" },
        { id: "activity", label: "Activity" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={<CubeIcon className="w-7 h-7 text-purple-600" />}
            iconBg="bg-purple-500/10"
            title={data.name}
            subtitle={data.description || "Service"}
            badge={{
                label: statusLabel,
                dotColor: data.status === "active" ? "bg-emerald-500" : "bg-amber-500",
            }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "Name", value: data.name, dbColumn: "name", type: "text", rawValue: data.name },
                                { label: "Description", value: data.description, dbColumn: "description", type: "text", rawValue: data.description },
                                { label: "Initial Value", value: formatCurrency(data.initial_value), dbColumn: "initial_value", type: "number", rawValue: data.initial_value ?? 0 },
                                { label: "Monthly Value", value: formatCurrency(data.monthly_value), dbColumn: "monthly_value", type: "number", rawValue: data.monthly_value ?? 0 },
                                { label: "Yearly Value", value: formatCurrency(data.yearly_value), dbColumn: "yearly_value", type: "number", rawValue: data.yearly_value ?? 0 },
                                { label: "Status", value: statusLabel, dbColumn: "status", type: "select", rawValue: data.status, options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
                                { label: "Created", value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }) },
                            ]}
                        />
                    </div>
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="product" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="product" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
