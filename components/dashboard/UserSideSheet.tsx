"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, getDisplayName, getInitials, timeAgo, type AppUser } from "@/lib/utils";
import { SideSheetLayout } from "@/features/side-sheets/SideSheetLayout";
import { DetailFields } from "@/components/sheets/DetailFields";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Project = { id: string; title: string; status: string; role: string };
type UserJob = {
    id: string;
    job_title: string;
    status: string;
    amount: number;
    scheduled_date: string | null;
    company_name: string | null;
};
type UserActivity = {
    id: string;
    entity_type: string;
    action: string;
    changes: Record<string, { old: string; new: string }> | null;
    created_at: string;
};

interface UserSideSheetProps {
    user: AppUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function UserSideSheet({ user, open, onOpenChange, onUpdate }: UserSideSheetProps) {
    const [activeTab, setActiveTab] = useState("profile");
    const [data, setData] = useState<AppUser | null>(user);
    const [projects, setProjects] = useState<Project[]>([]);
    const [jobs, setJobs] = useState<UserJob[]>([]);
    const [activities, setActivities] = useState<UserActivity[]>([]);

    useEffect(() => { setData(user); }, [user]);
    useEffect(() => { if (data?.id) setActiveTab("profile"); }, [data?.id]);

    // Fetch projects where user is client or creator
    useEffect(() => {
        if (!data?.id) return;
        const supabase = createClient();
        const clientQ = supabase.from("projects").select("id, title, status").eq("client_id", data.id);
        const creatorQ = supabase.from("projects").select("id, title, status").eq("created_by", data.id);
        Promise.all([clientQ, creatorQ]).then(([clientRes, creatorRes]) => {
            const map = new Map<string, Project>();
            (clientRes.data || []).forEach(p => map.set(p.id, { ...p, role: "Client" }));
            (creatorRes.data || []).forEach(p => {
                if (!map.has(p.id)) map.set(p.id, { ...p, role: "Creator" });
            });
            setProjects(Array.from(map.values()));
        });
    }, [data?.id]);

    // Fetch jobs via job_assignees
    useEffect(() => {
        if (!data?.id) return;
        const supabase = createClient();
        supabase
            .from("job_assignees")
            .select("job:jobs ( id, job_title, status, amount, scheduled_date, company:companies ( name ) )")
            .eq("user_id", data.id)
            .then(({ data: rows }) => {
                type JobRow = {
                    id: string;
                    job_title: string;
                    status: string;
                    amount: number;
                    scheduled_date: string | null;
                    company: { name: string } | null;
                };
                type AssigneeRow = { job: JobRow | null };
                const list = ((rows as AssigneeRow[] | null) || [])
                    .map((r) => r.job)
                    .filter((j): j is JobRow => Boolean(j))
                    .map((j) => ({
                        id: j.id,
                        job_title: j.job_title,
                        status: j.status,
                        amount: j.amount,
                        scheduled_date: j.scheduled_date,
                        company_name: j.company?.name || null,
                    }));
                setJobs(list);
            });
    }, [data?.id]);

    // Fetch activity performed by user
    useEffect(() => {
        if (!data?.id) return;
        const supabase = createClient();
        supabase
            .from("activity_logs")
            .select("id, entity_type, action, changes, created_at")
            .eq("performed_by", data.id)
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data: rows }) => {
                setActivities(rows || []);
            });
    }, [data?.id]);

    const handleSave = useCallback(async (column: string, value: string | number | null) => {
        if (!data) return;
        // Profile field updates go through the admin-gated API so an owner/admin
        // can edit other users' fields. RLS only permits self-update, so a direct
        // client write would silently fail for cross-user edits.
        const body: Record<string, unknown> = {};
        body[column] = value;
        try {
            const res = await fetch(`/api/users/${data.id}/profile`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
            return;
        }
        setData(prev => prev ? {
            ...prev,
            user_metadata: { ...prev.user_metadata, [column]: value },
        } : prev);
        onUpdate?.();
    }, [data, onUpdate]);

    if (!data) return null;

    const tenantRole = data.tenant_role || data.user_metadata.user_type || "member";

    const tabs = [
        { id: "profile", label: "Profile" },
        { id: "projects", label: `Projects (${projects.length})` },
        { id: "jobs", label: `Jobs (${jobs.length})` },
        { id: "activity", label: "Activity" },
    ];

    return (
        <SideSheetLayout
            open={open}
            onOpenChange={onOpenChange}
            icon={
                <span className="text-sm font-bold text-foreground">
                    {getInitials(data)}
                </span>
            }
            iconBg="bg-secondary"
            title={getDisplayName(data)}
            subtitle={data.user_metadata.position || data.email}
            badge={{ label: tenantRole, dotColor: tenantRole === "owner" ? "bg-purple-500" : tenantRole === "admin" ? "bg-amber-500" : "bg-blue-500" }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        >
            {activeTab === "profile" && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <DetailFields
                            onSave={handleSave}
                            fields={[
                                {
                                    label: "Position",
                                    value: data.user_metadata.position || null,
                                    dbColumn: "position",
                                    type: "text",
                                    rawValue: data.user_metadata.position || null,
                                },
                                { label: "Email", value: data.email },
                                {
                                    label: "Hourly Rate",
                                    value: data.user_metadata.hourly_rate != null
                                        ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(data.user_metadata.hourly_rate))
                                        : "$0.00",
                                    dbColumn: "hourly_rate",
                                    type: "number",
                                    rawValue: data.user_metadata.hourly_rate ?? 0,
                                },
                                {
                                    label: "Joined",
                                    value: new Date(data.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" }),
                                },
                            ]}
                        />
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Role & Permissions</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Tenant Role</span>
                            <select
                                value={tenantRole}
                                onChange={async (e) => {
                                    const newRole = e.target.value;
                                    try {
                                        const res = await fetch("/api/users", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ user_id: data.id, role: newRole }),
                                        });
                                        if (!res.ok) {
                                            const err = await res.json();
                                            throw new Error(err.error || "Failed to update role");
                                        }
                                        setData(prev => prev ? { ...prev, tenant_role: newRole, user_metadata: { ...prev.user_metadata, user_type: newRole } } : prev);
                                        toast.success(`Role updated to ${newRole}`);
                                        onUpdate?.();
                                    } catch (err) {
                                        toast.error(err instanceof Error ? err.message : "Failed to update role");
                                    }
                                }}
                                className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background capitalize"
                            >
                                {["owner", "admin", "manager", "member", "viewer"].map(r => (
                                    <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "projects" && (
                <div className="space-y-3">
                    {projects.length === 0 ? (
                        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            No projects found for this user
                        </div>
                    ) : (
                        projects.map((proj) => (
                            <div key={proj.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {proj.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{proj.title}</p>
                                        <p className="text-[11px] text-muted-foreground capitalize">
                                            {proj.status.replace(/_/g, " ")} &middot; {proj.role}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    proj.status === "completed" ? "bg-emerald-500" :
                                    proj.status === "in_progress" ? "bg-blue-500" :
                                    proj.status === "cancelled" ? "bg-rose-400" : "bg-amber-500"
                                )} />
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "jobs" && (
                <div className="space-y-3">
                    {jobs.length === 0 ? (
                        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            No jobs assigned to this user
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600">
                                        J
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{job.job_title}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            ${job.amount.toLocaleString()}
                                            {job.company_name ? ` \u00b7 ${job.company_name}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    job.status === "completed" ? "bg-emerald-500" :
                                    job.status === "in_progress" ? "bg-blue-500" :
                                    job.status === "cancelled" ? "bg-rose-400" : "bg-amber-500"
                                )} />
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "activity" && (
                <div className="relative">
                    {activities.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No activity yet</p>
                        </div>
                    ) : (
                        <>
                            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
                            <div className="space-y-4">
                                {activities.map((a) => (
                                    <div key={a.id} className="flex gap-3 relative">
                                        <div className={cn(
                                            "w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold z-10",
                                            a.action === "created" ? "bg-emerald-500" :
                                            a.action === "status_changed" ? "bg-amber-500" : "bg-blue-500"
                                        )}>
                                            {a.action === "created" ? "+" : "~"}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="text-xs font-semibold text-foreground capitalize">
                                                    {a.action.replace(/_/g, " ")}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground capitalize">
                                                    {a.entity_type}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                                                    {timeAgo(a.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </SideSheetLayout>
    );
}
