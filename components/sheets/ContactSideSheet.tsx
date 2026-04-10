"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailFields, LinkedEntityCard } from "./DetailFields";
import { NotesPanel } from "./NotesPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { createClient } from "@/lib/supabase/client";
import { IconUsersGroup as UserGroupIcon } from "@tabler/icons-react";

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    status: string;
    company?: { id: string; name: string } | null;
    created_at: string;
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
        const supabase = createClient();
        const { error } = await supabase
            .from("contacts")
            .update({ [column]: value, updated_at: new Date().toISOString() })
            .eq("id", data.id);
        if (!error) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

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
                                { label: "Email", value: data.email, dbColumn: "email", type: "text", rawValue: data.email },
                                { label: "Phone", value: data.phone, dbColumn: "phone", type: "text", rawValue: data.phone },
                                { label: "Job Title", value: data.job_title, dbColumn: "job_title", type: "text", rawValue: data.job_title },
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
