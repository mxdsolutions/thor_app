"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DetailFields } from "@/components/sheets/DetailFields";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import type { JobDetailJob } from "../JobDetailView";
import { EntityPreviewCard } from "@/components/entity-preview/EntityPreviewCard";

type DetailValue = string | number | null;
type StatusConfig = Record<string, { label: string; color: string }>;
type User = { value: string; label: string };

interface Props {
    data: JobDetailJob;
    setData: React.Dispatch<React.SetStateAction<JobDetailJob>>;
    handleSave: (column: string, value: DetailValue) => Promise<void>;
    handleContactChange: (id: string, option?: EntityOption) => Promise<void>;
    handleCompanyChange: (id: string) => Promise<void>;
    contactOptions: EntityOption[];
    companyOptions: EntityOption[];
    contactsLoading: boolean;
    companiesLoading: boolean;
    onContactCreated: () => void;
    onCompanyCreated: () => void;
    statusConfig: StatusConfig;
    paidStatusConfig: StatusConfig;
    users: User[];
    onUpdate?: () => void;
}

export function JobDetailsTab({
    data,
    setData,
    handleSave,
    handleContactChange,
    handleCompanyChange,
    contactOptions,
    companyOptions,
    contactsLoading,
    companiesLoading,
    onContactCreated,
    onCompanyCreated,
    statusConfig,
    paidStatusConfig,
    users,
    onUpdate,
}: Props) {
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState("");

    const stageOrder = Object.keys(statusConfig).filter((k) => k !== "cancelled");
    const currentIdx = stageOrder.indexOf(data.status);
    const status = statusConfig[data.status] || statusConfig.new;

    return (
        <div className="space-y-4">
            {/* Stage progress chevrons */}
            {stageOrder.length > 0 && (
                <div className="flex items-stretch w-full">
                    {stageOrder.map((key, idx) => {
                        const cfg = statusConfig[key];
                        const isReached = currentIdx > -1 && idx <= currentIdx;
                        const isFirst = idx === 0;
                        const isLast = idx === stageOrder.length - 1;
                        const clipPath = isFirst
                            ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                            : isLast
                                ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
                                : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleSave("status", key)}
                                style={{ clipPath, marginLeft: isFirst ? 0 : -12 }}
                                className={cn(
                                    "flex-1 h-11 flex items-center justify-center px-5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                                    isReached
                                        ? "bg-foreground text-background hover:bg-foreground/90"
                                        : "bg-muted/70 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <DetailFields
                    onSave={handleSave}
                    fields={[
                        { label: "Job ID", value: data.reference_id, dbColumn: "reference_id", type: "text", rawValue: data.reference_id },
                        { label: "Job Name", value: data.job_title, dbColumn: "job_title", type: "text", rawValue: data.job_title },
                    ]}
                />

                <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground shrink-0 pt-2">Customer</span>
                    <div className="w-64 max-w-full">
                        <EntitySearchDropdown
                            value={data.contact?.id ?? ""}
                            onChange={handleContactChange}
                            options={contactOptions}
                            placeholder="Search or create contact..."
                            entityType="contact"
                            onCreated={onContactCreated}
                            loading={contactsLoading}
                        />
                    </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground shrink-0 pt-2">Company</span>
                    <div className="w-64 max-w-full">
                        <EntitySearchDropdown
                            value={data.company?.id ?? ""}
                            onChange={handleCompanyChange}
                            options={companyOptions}
                            placeholder="Search or create company..."
                            entityType="company"
                            onCreated={onCompanyCreated}
                            loading={companiesLoading}
                        />
                    </div>
                </div>

                <DetailFields
                    onSave={handleSave}
                    fields={[
                        { label: "Status", value: status.label, dbColumn: "status", type: "select", rawValue: data.status, options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                        { label: "Scheduled Date", value: data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString("en-AU", { dateStyle: "medium" }) : null, dbColumn: "scheduled_date", type: "date", rawValue: data.scheduled_date },
                        { label: "Paid Status", value: paidStatusConfig[data.paid_status]?.label || "Not Paid", dbColumn: "paid_status", type: "select", rawValue: data.paid_status, options: Object.entries(paidStatusConfig).map(([k, v]) => ({ value: k, label: v.label })) },
                        { label: "Payment Received", value: `$${(data.total_payment_received || 0).toLocaleString()}`, dbColumn: "total_payment_received", type: "number", rawValue: data.total_payment_received || 0 },
                        { label: "Amount", value: `$${(data.amount || 0).toLocaleString()}`, dbColumn: "amount", type: "number", rawValue: data.amount || 0 },
                        { label: "Created", value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }) },
                    ]}
                />
            </div>

            {/* Description */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                {editingDescription ? (
                    <textarea
                        autoFocus
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        onBlur={async () => {
                            setEditingDescription(false);
                            const trimmed = descriptionDraft.trim();
                            const newVal = trimmed === "" ? null : trimmed;
                            if (newVal !== (data.description ?? null)) {
                                await handleSave("description", newVal);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setEditingDescription(false);
                                setDescriptionDraft(data.description ?? "");
                            }
                        }}
                        rows={4}
                        className="w-full text-[15px] text-foreground bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background resize-none"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setDescriptionDraft(data.description ?? "");
                            setEditingDescription(true);
                        }}
                        className="w-full text-left text-[15px] text-foreground whitespace-pre-wrap rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors cursor-text"
                    >
                        {data.description || <span className="text-muted-foreground/40 italic text-sm">Click to add a description</span>}
                    </button>
                )}
            </div>

            {/* Assignees */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignees</p>
                <div className="space-y-2">
                    {(data.assignees || []).map((a, idx) => (
                        <div key={a.id ?? idx} className="flex items-center justify-between gap-3">
                            <EntityPreviewCard entityType="user" entityId={a.id} disabled={!a.id}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                        {(a.full_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium underline underline-offset-2">{a.full_name || a.email}</span>
                                </div>
                            </EntityPreviewCard>
                            <button
                                onClick={async () => {
                                    const newIds = (data.assignees || []).filter(x => x.id !== a.id).map(x => x.id);
                                    const res = await fetch("/api/jobs", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: data.id, assignee_ids: newIds }),
                                    });
                                    if (res.ok) {
                                        setData(prev => ({ ...prev, assignees: prev.assignees.filter(x => x.id !== a.id) }));
                                        onUpdate?.();
                                    }
                                }}
                                className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
                <select
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    value=""
                    onChange={async (e) => {
                        const userId = e.target.value;
                        if (!userId) return;
                        const existing = (data.assignees || []).map(a => a.id);
                        if (existing.includes(userId)) return;
                        const newIds = [...existing, userId];
                        const res = await fetch("/api/jobs", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: data.id, assignee_ids: newIds }),
                        });
                        if (res.ok) {
                            const user = users.find(u => u.value === userId);
                            setData(prev => ({
                                ...prev,
                                assignees: [...prev.assignees, { id: userId, full_name: user?.label || null, email: null }],
                            }));
                            onUpdate?.();
                        }
                    }}
                >
                    <option value="">Add assignee...</option>
                    {users.filter(u => !(data.assignees || []).some(a => a.id === u.value)).map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
