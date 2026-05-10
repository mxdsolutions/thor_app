"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { useArchiveAction } from "./use-archive-action";
import { toast } from "sonner";

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    status: string;
    company?: { id: string; name: string } | null;
    created_at: string;
    archived_at?: string | null;
};

interface ContactSideSheetProps {
    contact: Contact | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function ContactSideSheet({ contact, open, onOpenChange, onUpdate }: ContactSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Contact | null>(contact);

    useEffect(() => { setData(contact); }, [contact]);
    useEffect(() => { if (data?.id) setActiveTab("details"); }, [data?.id]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch("/api/contacts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, [column]: value }),
        });
        if (res.ok) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        } else {
            toast.error("Failed to update field");
        }
    }, [data, onUpdate]);

    const archive = useArchiveAction({
        entityName: "contact",
        endpoint: data ? `/api/contacts/${data.id}/archive` : "",
        archived: !!data?.archived_at,
        onArchived: (archivedAt) => {
            setData((prev) => prev ? { ...prev, archived_at: archivedAt } : prev);
            onUpdate?.();
        },
    });

    if (!data) return null;

    const initials = `${data.first_name[0] || ""}${data.last_name[0] || ""}`.toUpperCase();
    const fullName = `${data.first_name} ${data.last_name}`;
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
            icon={<span className="text-lg font-bold text-violet-600">{initials}</span>}
            iconBg="bg-violet-500/10"
            title={fullName}
            subtitle={data.job_title || data.email || "Contact"}
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
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                { label: "First Name", value: data.first_name, dbColumn: "first_name", type: "text", rawValue: data.first_name },
                                { label: "Last Name", value: data.last_name, dbColumn: "last_name", type: "text", rawValue: data.last_name },
                                {
                                    label: "Type",
                                    value: data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : null,
                                    dbColumn: "type",
                                    type: "select",
                                    rawValue: data.type,
                                    options: [
                                        { value: "business", label: "Business" },
                                        { value: "customer", label: "Customer" },
                                    ],
                                },
                                { label: "Email", value: data.email, dbColumn: "email", type: "text", rawValue: data.email },
                                { label: "Phone", value: data.phone, dbColumn: "phone", type: "text", rawValue: data.phone },
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

                    {data.company && (
                        <LinkedEntityCard
                            label="Company"
                            title={data.company.name}
                            entityType="company"
                            entityId={data.company.id}
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
                <NotesPanel entityType="contact" entityId={data.id} />
            )}

            {activeTab === "activity" && (
                <ActivityTimeline entityType="contact" entityId={data.id} />
            )}
        </SideSheetLayout>
    );
}
