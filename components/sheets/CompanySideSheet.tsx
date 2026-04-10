"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { createClient } from "@/lib/supabase/client";
import { IconBuildingSkyscraper as BuildingOffice2Icon } from "@tabler/icons-react";

type Company = {
    id: string;
    name: string;
    industry: string | null;
    phone: string | null;
    email: string | null;
    website?: string | null;
    city: string | null;
    state: string | null;
    address?: string | null;
    postcode?: string | null;
    status: string;
    notes?: string | null;
    created_at: string;
};

interface CompanySideSheetProps {
    company: Company | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function CompanySideSheet({ company, open, onOpenChange, onUpdate }: CompanySideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Company | null>(company);

    useEffect(() => { setData(company); }, [company]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const supabase = createClient();
        const { error } = await supabase
            .from("companies")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    if (!data) return null;

    const location = [data.city, data.state].filter(Boolean).join(", ");
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
            icon={<BuildingOffice2Icon className="w-7 h-7 text-blue-600" />}
            iconBg="bg-blue-500/10"
            title={data.name}
            subtitle={data.industry || location || "Company"}
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
                                { label: "Industry", value: data.industry, dbColumn: "industry", type: "text", rawValue: data.industry },
                                { label: "Email", value: data.email, dbColumn: "email", type: "text", rawValue: data.email },
                                { label: "Phone", value: data.phone, dbColumn: "phone", type: "text", rawValue: data.phone },
                                { label: "Website", value: data.website, dbColumn: "website", type: "text", rawValue: data.website },
                                { label: "Address", value: data.address, dbColumn: "address", type: "text", rawValue: data.address },
                                { label: "City", value: data.city, dbColumn: "city", type: "text", rawValue: data.city },
                                { label: "State", value: data.state, dbColumn: "state", type: "text", rawValue: data.state },
                                { label: "Postcode", value: data.postcode, dbColumn: "postcode", type: "text", rawValue: data.postcode },
                                {
                                    label: "Status",
                                    value: statusLabel,
                                    dbColumn: "status",
                                    type: "select",
                                    rawValue: data.status,
                                    options: [
                                        { value: "active", label: "Active" },
                                        { value: "inactive", label: "Inactive" },
                                    ],
                                },
                                {
                                    label: "Created",
                                    value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}

            {activeTab === "notes" && (
                <NotesPanel entityType="company" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="company" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
