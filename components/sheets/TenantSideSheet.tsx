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
import { toast } from "sonner";
import { DetailFields } from "./DetailFields";
import { TenantDetailsTab } from "./tenant-tabs/TenantDetailsTab";
import { TenantAccessTab } from "./tenant-tabs/TenantAccessTab";
import { TenantUsersTab } from "./tenant-tabs/TenantUsersTab";
import { TenantStatusesTab } from "./tenant-tabs/TenantStatusesTab";
import { TenantModulesTab } from "./tenant-tabs/TenantModulesTab";
import type { Tenant } from "./tenant-tabs/types";

interface TenantSideSheetProps {
    tenantId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function TenantSideSheet({ tenantId, open, onOpenChange, onUpdate }: TenantSideSheetProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [data, setData] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(false);
    const [suspending, setSuspending] = useState(false);

    useEffect(() => {
        if (!tenantId || !open) return;
        setActiveTab("details");
        setLoading(true);
        fetch(`/api/platform-admin/tenants/${tenantId}`)
            .then((r) => r.json())
            .then((d) => setData(d.item || null))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [tenantId, open]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        const res = await fetch(`/api/platform-admin/tenants/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [column]: value }),
        });
        if (res.ok) {
            setData((prev) => prev ? { ...prev, [column]: value } : prev);
            onUpdate?.();
        }
    }, [data, onUpdate]);

    const handleSuspendToggle = useCallback(async () => {
        if (!data) return;
        const action = data.status === "suspended" ? "reactivate" : "suspend";
        const confirmed = window.confirm(
            action === "suspend"
                ? `Suspend ${data.company_name || data.name}? Users will lose access.`
                : `Reactivate ${data.company_name || data.name}?`
        );
        if (!confirmed) return;

        setSuspending(true);
        try {
            const res = await fetch(`/api/platform-admin/tenants/${data.id}/suspend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                const updated = await res.json();
                setData((prev) => prev ? { ...prev, ...updated.item } : prev);
                onUpdate?.();
                toast.success(action === "suspend" ? "Tenant suspended" : "Tenant reactivated");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSuspending(false);
        }
    }, [data, onUpdate]);

    const tabs = [
        { id: "details", label: "Details" },
        { id: "access", label: "Access" },
        { id: "users", label: "Users" },
        { id: "plan", label: "Plan" },
        { id: "statuses", label: "Statuses" },
        { id: "modules", label: "Modules" },
    ];

    const displayName = data?.company_name || data?.name || "";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border">
                    {loading ? (
                        <SheetHeader className="space-y-0 text-left">
                            <SheetTitle className="sr-only">Loading tenant</SheetTitle>
                            <div className="animate-pulse space-y-2">
                                <div className="h-6 w-48 bg-secondary rounded" />
                                <div className="h-4 w-32 bg-secondary rounded" />
                            </div>
                        </SheetHeader>
                    ) : data && (
                        <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-xl text-foreground ring-1 ring-border/50 shrink-0 mt-0.5">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-center gap-2.5">
                                    <SheetTitle className="font-statement text-xl font-extrabold tracking-tight truncate">{displayName}</SheetTitle>
                                    <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full mr-1.5",
                                            data.status === "active" ? "bg-emerald-500" : data.status === "suspended" ? "bg-rose-500" : "bg-amber-500"
                                        )} />
                                        {data.status}
                                    </Badge>
                                </div>
                                <SheetDescription className="text-sm text-muted-foreground mt-1 truncate">
                                    {data.slug}
                                </SheetDescription>
                            </div>
                        </SheetHeader>
                    )}
                </div>

                {/* Tabs + Content */}
                <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                    <div className="px-6 border-b border-border/50 bg-background overflow-x-auto">
                        <div className="flex gap-5 -mb-px pt-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "pb-3 text-sm font-medium transition-colors relative focus:outline-none whitespace-nowrap shrink-0",
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
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-40 bg-secondary rounded-xl" />
                            </div>
                        ) : data && (
                            <>
                                {activeTab === "details" && <TenantDetailsTab data={data} onSave={handleSave} />}
                                {activeTab === "access" && (
                                    <TenantAccessTab
                                        data={data}
                                        onSave={handleSave}
                                        onSuspendToggle={handleSuspendToggle}
                                        suspending={suspending}
                                    />
                                )}
                                {activeTab === "users" && <TenantUsersTab members={data.members} />}
                                {activeTab === "plan" && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    { label: "Active Members", value: String(data.member_count) },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === "statuses" && <TenantStatusesTab tenantId={data.id} />}
                                {activeTab === "modules" && <TenantModulesTab tenantId={data.id} />}
                            </>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
