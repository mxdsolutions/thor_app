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
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { DetailFields } from "./DetailFields";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import { toast } from "sonner";
import { IconChevronDown as ChevronDownIcon, IconX as XMarkIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import type { StatusItem } from "@/lib/status-config";

const PRESET_COLORS = [
    "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-rose-400",
    "bg-violet-500", "bg-indigo-500", "bg-red-500", "bg-green-500",
    "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500",
    "bg-teal-500", "bg-orange-500",
];

const MODULE_TREE = [
    {
        workspace: "CRM",
        id: "crm",
        children: [
            { id: "crm.companies", label: "Companies" },
            { id: "crm.contacts", label: "Contacts" },
        ],
    },
    {
        workspace: "Operations",
        id: "operations",
        children: [
            { id: "operations.jobs", label: "Jobs" },
            { id: "operations.projects", label: "Scopes" },
            { id: "operations.services", label: "Services" },
            { id: "operations.reports", label: "Reports" },
        ],
    },
    {
        workspace: "Finance",
        id: "finance",
        children: [
            { id: "finance.quotes", label: "Quotes" },
            { id: "finance.invoices", label: "Invoices" },
            { id: "finance.pricing", label: "Pricing" },
        ],
    },
];

type TenantMember = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { full_name: string; email: string; avatar_url: string | null } | null;
};

type Tenant = {
    id: string;
    name: string;
    company_name: string | null;
    slug: string;
    plan: string;
    status: string;
    max_users: number;
    member_count: number;
    owner: { full_name: string; email: string } | null;
    owner_id: string | null;
    logo_url: string | null;
    logo_dark_url: string | null;
    primary_color: string | null;
    custom_domain: string | null;
    domain_verified: boolean;
    address: string | null;
    phone: string | null;
    email: string | null;
    abn: string | null;
    trial_ends_at: string | null;
    created_at: string;
    members?: TenantMember[];
    notes: string | null;
};

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

    // Statuses tab state
    const [jobStatuses, setJobStatuses] = useState<StatusItem[]>([]);
    const [statusesLoaded, setStatusesLoaded] = useState(false);
    const [statusesSaving, setStatusesSaving] = useState(false);
    const [statusesDirty, setStatusesDirty] = useState<Set<string>>(new Set());
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(["job"]));
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

    // Modules tab state
    const [modules, setModules] = useState<{ module_id: string; enabled: boolean }[]>([]);
    const [modulesLoaded, setModulesLoaded] = useState(false);
    const [modulesSaving, setModulesSaving] = useState(false);

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

    const handleSuspendToggle = async () => {
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
    };

    // Fetch statuses when tab activates
    useEffect(() => {
        if (activeTab !== "statuses" || !data?.id || statusesLoaded) return;
        const fetchStatuses = async () => {
            try {
                const jobRes = await fetch(`/api/platform-admin/tenant-config/status?tenant_id=${data.id}&entity_type=job`);
                const jobData = await jobRes.json();
                setJobStatuses(jobData.statuses || []);
                setStatusesLoaded(true);
                setStatusesDirty(new Set());
            } catch {
                toast.error("Failed to load statuses");
            }
        };
        fetchStatuses();
    }, [activeTab, data?.id, statusesLoaded]);

    // Fetch modules when tab activates
    useEffect(() => {
        if (activeTab !== "modules" || !data?.id || modulesLoaded) return;
        const fetchModules = async () => {
            try {
                const res = await fetch(`/api/platform-admin/tenant-config/modules?tenant_id=${data.id}`);
                const json = await res.json();
                setModules(json.modules || []);
                setModulesLoaded(true);
            } catch {
                toast.error("Failed to load modules");
            }
        };
        fetchModules();
    }, [activeTab, data?.id, modulesLoaded]);

    // Reset statuses/modules loaded state when sheet reopens
    useEffect(() => {
        if (!open) {
            setStatusesLoaded(false);
            setModulesLoaded(false);
        }
    }, [open]);

    const toggleSection = useCallback((section: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    }, []);

    const markDirty = useCallback((entityType: string) => {
        setStatusesDirty((prev) => new Set(prev).add(entityType));
    }, []);

    const updateStatusLabel = useCallback((entityType: string, index: number, label: string) => {
        setJobStatuses((prev) => prev.map((s, i) => i === index ? { ...s, label, id: label.toLowerCase().replace(/\s+/g, "_") } : s));
        markDirty(entityType);
    }, [markDirty]);

    const updateStatusColor = useCallback((entityType: string, index: number, color: string) => {
        setJobStatuses((prev) => prev.map((s, i) => i === index ? { ...s, color } : s));
        markDirty(entityType);
        setColorPickerOpen(null);
    }, [markDirty]);

    const deleteStatus = useCallback((entityType: string, index: number) => {
        setJobStatuses((prev) => prev.filter((_, i) => i !== index));
        markDirty(entityType);
    }, [markDirty]);

    const addStatus = useCallback((entityType: string) => {
        const newStatus: StatusItem = {
            id: `new_status_${Date.now()}`,
            label: "New Status",
            color: "bg-blue-500",
            is_default: false,
            behaviors: [],
        };
        setJobStatuses((prev) => [...prev, newStatus]);
        markDirty(entityType);
    }, [markDirty]);

    const saveStatuses = useCallback(async () => {
        if (!data?.id) return;
        setStatusesSaving(true);
        try {
            const promises: Promise<Response>[] = [];
            if (statusesDirty.has("job")) {
                promises.push(fetch("/api/platform-admin/tenant-config/status", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenant_id: data.id, entity_type: "job", statuses: jobStatuses }),
                }));
            }
            const results = await Promise.all(promises);
            if (results.every((r) => r.ok)) {
                toast.success("Statuses saved");
                setStatusesDirty(new Set());
            } else {
                toast.error("Failed to save some statuses");
            }
        } catch {
            toast.error("Failed to save statuses");
        } finally {
            setStatusesSaving(false);
        }
    }, [data?.id, statusesDirty, jobStatuses]);

    const isModuleEnabled = useCallback((moduleId: string) => {
        const mod = modules.find((m) => m.module_id === moduleId);
        return mod?.enabled ?? true;
    }, [modules]);

    const toggleModule = useCallback((moduleId: string) => {
        setModules((prev) => {
            const existing = prev.find((m) => m.module_id === moduleId);
            const newEnabled = existing ? !existing.enabled : false;
            let next = existing
                ? prev.map((m) => m.module_id === moduleId ? { ...m, enabled: newEnabled } : m)
                : [...prev, { module_id: moduleId, enabled: false }];

            // If toggling a workspace-level module, also toggle children
            const workspace = MODULE_TREE.find((w) => w.id === moduleId);
            if (workspace) {
                const childIds = workspace.children.map((c) => c.id);
                next = next.map((m) => childIds.includes(m.module_id) ? { ...m, enabled: newEnabled } : m);
                // Add missing children
                for (const childId of childIds) {
                    if (!next.find((m) => m.module_id === childId)) {
                        next.push({ module_id: childId, enabled: newEnabled });
                    }
                }
            }
            return next;
        });
    }, []);

    const saveModules = useCallback(async () => {
        if (!data?.id) return;
        setModulesSaving(true);
        try {
            const res = await fetch("/api/platform-admin/tenant-config/modules", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant_id: data.id, modules }),
            });
            if (res.ok) {
                toast.success("Modules saved");
            } else {
                toast.error("Failed to save modules");
            }
        } catch {
            toast.error("Failed to save modules");
        } finally {
            setModulesSaving(false);
        }
    }, [data?.id, modules]);

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
                                    <SheetTitle className="text-xl font-bold truncate">{displayName}</SheetTitle>
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
                                {activeTab === "details" && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    { label: "Company Name", value: data.company_name || data.name, dbColumn: "company_name", type: "text", rawValue: data.company_name || data.name },
                                                    { label: "Slug", value: data.slug },
                                                    { label: "Owner", value: data.owner?.full_name || "—" },
                                                    { label: "Email", value: data.email, dbColumn: "email", type: "text", rawValue: data.email },
                                                    { label: "Phone", value: data.phone, dbColumn: "phone", type: "text", rawValue: data.phone },
                                                    { label: "Address", value: data.address, dbColumn: "address", type: "text", rawValue: data.address },
                                                    { label: "ABN", value: data.abn, dbColumn: "abn", type: "text", rawValue: data.abn },
                                                    {
                                                        label: "Created",
                                                        value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                                                    },
                                                ]}
                                            />
                                        </div>

                                        {/* Branding */}
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-3">
                                                Branding
                                            </p>
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Primary Color</span>
                                                    <div className="flex items-center gap-2">
                                                        {data.primary_color ? (
                                                            <>
                                                                <div
                                                                    className="w-5 h-5 rounded-full ring-1 ring-border/50"
                                                                    style={{ backgroundColor: data.primary_color }}
                                                                />
                                                                <span className="text-sm text-foreground">{data.primary_color}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Logo</span>
                                                    {data.logo_url ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */
                                                        <img src={data.logo_url} alt="Logo" className="h-8 object-contain" />
                                                    ) : (
                                                        <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                                                    )}
                                                </div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Logo (Dark)</span>
                                                    {data.logo_dark_url ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */
                                                        <img src={data.logo_dark_url} alt="Logo Dark" className="h-8 object-contain bg-black rounded p-1" />
                                                    ) : (
                                                        <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                                                    )}
                                                </div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Custom Domain</span>
                                                    <span className="text-sm text-foreground text-right">
                                                        {data.custom_domain ? (
                                                            <span className="flex items-center gap-2">
                                                                {data.custom_domain}
                                                                <Badge variant={data.domain_verified ? "default" : "secondary"} className="text-[10px]">
                                                                    {data.domain_verified ? "Verified" : "Pending"}
                                                                </Badge>
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/40">&mdash;</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    { label: "Internal Notes", value: data.notes, dbColumn: "notes", type: "textarea", rawValue: data.notes },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "access" && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    {
                                                        label: "Status",
                                                        value: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : null,
                                                        dbColumn: "status",
                                                        type: "select",
                                                        rawValue: data.status,
                                                        options: [
                                                            { value: "active", label: "Active" },
                                                            { value: "suspended", label: "Suspended" },
                                                        ],
                                                    },
                                                    { label: "Custom Domain", value: data.custom_domain || "Not configured" },
                                                    { label: "Domain Verified", value: data.domain_verified ? "Yes" : "No" },
                                                ]}
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                variant={data.status === "suspended" ? "default" : "destructive"}
                                                onClick={handleSuspendToggle}
                                                disabled={suspending}
                                            >
                                                {data.status === "suspended" ? "Reactivate Tenant" : "Suspend Tenant"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "users" && (
                                    <div className="space-y-4">
                                        {!data.members || data.members.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-border">
                                                <table className={tableBase + " border-collapse min-w-full"}>
                                                    <thead className={tableHead}>
                                                        <tr>
                                                            <th className={tableHeadCell + " pl-4 pr-4"}>Name</th>
                                                            <th className={tableHeadCell + " px-4"}>Email</th>
                                                            <th className={tableHeadCell + " px-4"}>Role</th>
                                                            <th className={tableHeadCell + " pl-4 pr-4"}>Joined</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.members.map((member) => (
                                                            <tr key={member.user_id} className={tableRow}>
                                                                <td className={tableCell + " pl-4 pr-4 font-medium"}>
                                                                    {member.profiles?.full_name || "—"}
                                                                </td>
                                                                <td className={tableCellMuted + " px-4"}>
                                                                    {member.profiles?.email || "—"}
                                                                </td>
                                                                <td className={tableCell + " px-4"}>
                                                                    <Badge variant="secondary">{member.role}</Badge>
                                                                </td>
                                                                <td className={tableCellMuted + " pl-4 pr-4"}>
                                                                    {timeAgo(member.joined_at)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "plan" && (
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-border bg-card p-5">
                                            <DetailFields
                                                onSave={handleSave}
                                                fields={[
                                                    {
                                                        label: "Plan",
                                                        value: data.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : null,
                                                        dbColumn: "plan",
                                                        type: "select",
                                                        rawValue: data.plan,
                                                        options: [
                                                            { value: "trial", label: "Trial" },
                                                            { value: "paid", label: "Paid" },
                                                        ],
                                                    },
                                                    { label: "Max Users", value: String(data.max_users), dbColumn: "max_users", type: "number", rawValue: data.max_users },
                                                    { label: "Current Users", value: String(data.member_count) },
                                                    {
                                                        label: "Trial Ends",
                                                        value: data.trial_ends_at
                                                            ? new Date(data.trial_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                            : "N/A",
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "statuses" && (
                                    <div className="space-y-4">
                                        {!statusesLoaded ? (
                                            <div className="animate-pulse space-y-4">
                                                <div className="h-40 bg-secondary rounded-xl" />
                                            </div>
                                        ) : (
                                            <>
                                                {([
                                                    { key: "job", label: "Job Statuses", items: jobStatuses, setter: setJobStatuses },
                                                ] as const).map(({ key, label, items }) => (
                                                    <div key={key} className="rounded-xl border border-border bg-card">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSection(key)}
                                                            className="w-full flex items-center justify-between p-5 pb-3"
                                                        >
                                                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                                                                {label}
                                                            </p>
                                                            <ChevronDownIcon
                                                                className={cn(
                                                                    "w-4 h-4 text-muted-foreground/60 transition-transform",
                                                                    openSections.has(key) && "rotate-180"
                                                                )}
                                                            />
                                                        </button>

                                                        {openSections.has(key) && (
                                                            <div className="px-5 pb-5 space-y-2">
                                                                {items.map((status, index) => (
                                                                    <div
                                                                        key={status.id + index}
                                                                        className="group flex items-center gap-3 py-1.5"
                                                                    >
                                                                        <div className="relative">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setColorPickerOpen(
                                                                                    colorPickerOpen === `${key}-${index}` ? null : `${key}-${index}`
                                                                                )}
                                                                                className={cn("w-3 h-3 rounded-full shrink-0 cursor-pointer ring-1 ring-border/30", status.color)}
                                                                            />
                                                                            {colorPickerOpen === `${key}-${index}` && (
                                                                                <div className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 w-[148px]">
                                                                                    {PRESET_COLORS.map((c) => (
                                                                                        <button
                                                                                            key={c}
                                                                                            type="button"
                                                                                            onClick={() => updateStatusColor(key, index, c)}
                                                                                            className={cn(
                                                                                                "w-5 h-5 rounded-full ring-1 ring-border/30 hover:scale-110 transition-transform",
                                                                                                c,
                                                                                                status.color === c && "ring-2 ring-foreground"
                                                                                            )}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <input
                                                                            type="text"
                                                                            value={status.label}
                                                                            onChange={(e) => updateStatusLabel(key, index, e.target.value)}
                                                                            className="flex-1 text-sm bg-transparent border-0 border-b border-transparent focus:border-border focus:outline-none py-0.5 text-foreground"
                                                                        />

                                                                        {status.is_default && (
                                                                            <Badge variant="secondary" className="text-[10px] shrink-0">
                                                                                Default
                                                                            </Badge>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteStatus(key, index)}
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                                                        >
                                                                            <XMarkIcon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => addStatus(key)}
                                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                                                                >
                                                                    <PlusIcon className="w-3.5 h-3.5" />
                                                                    Add Status
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                <div className="pt-2">
                                                    <Button
                                                        onClick={saveStatuses}
                                                        disabled={statusesSaving || statusesDirty.size === 0}
                                                    >
                                                        {statusesSaving ? "Saving..." : "Save Changes"}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeTab === "modules" && (
                                    <div className="space-y-4">
                                        {!modulesLoaded ? (
                                            <div className="animate-pulse space-y-4">
                                                <div className="h-40 bg-secondary rounded-xl" />
                                            </div>
                                        ) : (
                                            <>
                                                {MODULE_TREE.map((workspace) => (
                                                    <div key={workspace.id} className="rounded-xl border border-border bg-card p-5">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                                                                {workspace.workspace}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleModule(workspace.id)}
                                                                className={cn(
                                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                                                    isModuleEnabled(workspace.id) ? "bg-foreground" : "bg-secondary"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
                                                                        isModuleEnabled(workspace.id) ? "translate-x-4" : "translate-x-0"
                                                                    )}
                                                                />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2 pl-3 border-l border-border/50 ml-1">
                                                            {workspace.children.map((child) => (
                                                                <div key={child.id} className="flex items-center justify-between py-1">
                                                                    <span className="text-sm text-foreground">{child.label}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleModule(child.id)}
                                                                        className={cn(
                                                                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                                                            isModuleEnabled(child.id) ? "bg-foreground" : "bg-secondary"
                                                                        )}
                                                                    >
                                                                        <span
                                                                            className={cn(
                                                                                "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
                                                                                isModuleEnabled(child.id) ? "translate-x-4" : "translate-x-0"
                                                                            )}
                                                                        />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="pt-2">
                                                    <Button
                                                        onClick={saveModules}
                                                        disabled={modulesSaving}
                                                    >
                                                        {modulesSaving ? "Saving..." : "Save Changes"}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
