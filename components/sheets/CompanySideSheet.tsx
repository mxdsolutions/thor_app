"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { useArchiveAction } from "./use-archive-action";
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
    is_supplier?: boolean | null;
    created_at: string;
    archived_at?: string | null;
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

    const handleSave = useCallback(async (column: string, value: string | number | boolean | null) => {
        if (!data) return;
        const res = await fetch("/api/companies", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const archive = useArchiveAction({
        entityName: "company",
        endpoint: data ? `/api/companies/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

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
            actions={archive.menu}
            banner={archive.banner}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "details" && (
                <div className="space-y-4">
                    {/* Supplier toggle — drives the supplier picker on POs */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <Checkbox
                                checked={!!data.is_supplier}
                                onCheckedChange={(v) => void handleSave("is_supplier", v === true)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">Is a supplier</p>
                                <p className="text-xs text-muted-foreground">
                                    Show this company when picking a vendor on purchase orders.
                                </p>
                            </div>
                        </label>
                    </div>
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
