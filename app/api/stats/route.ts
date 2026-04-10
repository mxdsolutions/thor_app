import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";

type JoinedProfile = { full_name: string } | { full_name: string }[] | null;
type JoinedProject = { title: string } | { title: string }[] | null;

function unwrapJoin<T>(val: T | T[] | null): T | null {
    if (Array.isArray(val)) return val[0] ?? null;
    return val;
}

export const GET = withAuth(async (_request, { supabase, tenantId }) => {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [
        statsResult,
        recentTransactionsResult,
        activeJobsResult,
        tasksDueResult,
        revenueChartResult,
    ] = await Promise.all([
        supabase.rpc("get_tenant_stats", { p_tenant_id: tenantId }),
        supabase.from("jobs").select(`id, amount, status, updated_at, project:projects(title), assigned_to:profiles!jobs_assigned_to_fkey(full_name)`).eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(5),
        supabase.from("jobs").select(`id, job_title, description, reference_id, amount, status, scheduled_date, project:projects(title), assigned_to:profiles!jobs_assigned_to_fkey(full_name)`).eq("tenant_id", tenantId).not("status", "in", '("Completed","Cancelled","cancelled","completed")').order("scheduled_date", { ascending: true }).limit(10),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["pending", "in_progress"]).lte("due_date", sevenDaysFromNow),
        supabase.rpc("get_revenue_chart_data", { p_tenant_id: tenantId }),
    ]);

    const coreStats = statsResult.data || {};

    return NextResponse.json({
        stats: {
            totalUsers: coreStats.totalUsers || 0,
            newUsers: coreStats.newUsers || 0,
            activeProjects: coreStats.activeProjects || 0,
            totalProjects: coreStats.totalProjects || 0,
            activeJobs: coreStats.activeJobs || 0,
            totalJobs: coreStats.totalJobs || 0,
            totalRevenue: coreStats.totalRevenue || 0,
            totalCompanies: coreStats.totalCompanies || 0,
            totalContacts: coreStats.totalContacts || 0,
            tasksDue: tasksDueResult.count || 0,
            revenueChart: revenueChartResult.data || [],
        },
        recentTransactions: (recentTransactionsResult.data || []).map(t => {
            const profile = unwrapJoin(t.assigned_to as JoinedProfile);
            const project = unwrapJoin(t.project as JoinedProject);
            return {
                id: t.id,
                user: profile?.full_name || "System",
                action: `Job: ${project?.title || "Untitled Scope"}`,
                amount: `$${((t.amount as number) || 0).toFixed(2)}`,
                status: t.status || "Unknown",
                date: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "Just now",
            };
        }),
        activeJobs: (activeJobsResult.data || []).map(j => {
            const profile = unwrapJoin(j.assigned_to as JoinedProfile);
            const project = unwrapJoin(j.project as JoinedProject);
            return {
                id: j.id,
                job_title: j.job_title,
                description: j.description || null,
                reference_id: j.reference_id || null,
                project: project?.title || null,
                assignedTo: profile?.full_name || null,
                amount: j.amount || 0,
                status: j.status || "Unknown",
                scheduledDate: j.scheduled_date,
            };
        })
    });
});
