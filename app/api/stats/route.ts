import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const authClient = await createClient();
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = await createAdminClient();
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run ALL queries in parallel
        const [
            { count: totalUsers },
            { count: newUsers },
            { count: activeProjects },
            { count: totalProjects },
            { count: activeJobs },
            { count: totalJobs },
            { data: completedJobs },
            { count: openLeads },
            { count: totalLeads },
            { count: totalOpportunities },
            { data: pipelineData },
            { data: wonThisMonth },
            { count: totalCompanies },
            { count: totalContacts },
            recentTransactionsResult,
            activeJobsResult,
            chartData,
        ] = await Promise.all([
            supabase.from("profiles").select("*", { count: "exact", head: true }),
            supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
            supabase.from("projects").select("*", { count: "exact", head: true }).neq("status", "completed"),
            supabase.from("projects").select("*", { count: "exact", head: true }),
            supabase.from("jobs").select("*", { count: "exact", head: true }).not("status", "in", '("Completed","Cancelled","cancelled","completed")'),
            supabase.from("jobs").select("*", { count: "exact", head: true }),
            supabase.from("jobs").select("amount").in("status", ["completed", "Completed"]),
            supabase.from("leads").select("*", { count: "exact", head: true }).not("status", "in", '("converted","unqualified")'),
            supabase.from("leads").select("*", { count: "exact", head: true }),
            supabase.from("opportunities").select("*", { count: "exact", head: true }),
            supabase.from("opportunities").select("value").not("stage", "in", '("closed_won","closed_lost")'),
            supabase.from("opportunities").select("value").in("stage", ["closed_won"]).gte("updated_at", monthStart.toISOString()),
            supabase.from("companies").select("*", { count: "exact", head: true }),
            supabase.from("contacts").select("*", { count: "exact", head: true }),
            supabase.from("jobs").select(`id, amount, status, updated_at, project:projects(title), assigned_to:profiles!jobs_assigned_to_fkey(full_name)`).order("updated_at", { ascending: false }).limit(5),
            supabase.from("jobs").select(`id, description, amount, status, scheduled_date, project:projects(title), assigned_to:profiles!jobs_assigned_to_fkey(full_name)`).not("status", "in", '("Completed","Cancelled","cancelled","completed")').order("scheduled_date", { ascending: true }).limit(10),
            buildChartData(supabase, now),
        ]);

        const totalRevenue = completedJobs?.reduce((sum, job) => sum + (job.amount || 0), 0) || 0;
        const pipelineValue = pipelineData?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;
        const wonRevenueThisMonth = wonThisMonth?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                newUsers: newUsers || 0,
                activeProjects: activeProjects || 0,
                totalProjects: totalProjects || 0,
                activeJobs: activeJobs || 0,
                totalJobs: totalJobs || 0,
                totalRevenue,
                openLeads: openLeads || 0,
                totalLeads: totalLeads || 0,
                totalOpportunities: totalOpportunities || 0,
                pipelineValue,
                wonRevenueThisMonth,
                totalCompanies: totalCompanies || 0,
                totalContacts: totalContacts || 0,
                opportunityChart: chartData,
            },
            recentTransactions: (recentTransactionsResult.data || []).map(t => ({
                id: t.id,
                user: t.assigned_to ? (t.assigned_to as any).full_name : "System",
                action: `Job: ${t.project ? (t.project as any).title : "Untitled Project"}`,
                amount: `$${((t.amount as number) || 0).toFixed(2)}`,
                status: t.status || "Unknown",
                date: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "Just now"
            })),
            activeJobs: (activeJobsResult.data || []).map(j => ({
                id: j.id,
                description: j.description,
                project: j.project ? (j.project as any).title : null,
                assignedTo: j.assigned_to ? (j.assigned_to as any).full_name : null,
                amount: j.amount || 0,
                status: j.status || "Unknown",
                scheduledDate: j.scheduled_date,
            }))
        });
    } catch (error: unknown) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function buildChartData(supabase: any, now: Date) {
    // Build all 24 chart queries in parallel (2 per month x 12 months)
    const months: { start: string; end: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            start: d.toISOString(),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
            label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        });
    }

    const queries = months.flatMap(m => [
        supabase.from("opportunities").select("*", { count: "exact", head: true }).gte("created_at", m.start).lt("created_at", m.end),
        supabase.from("opportunities").select("*", { count: "exact", head: true }).in("stage", ["closed_won"]).gte("updated_at", m.start).lt("updated_at", m.end),
    ]);

    const results = await Promise.all(queries);

    return months.map((m, i) => ({
        month: m.label,
        total: results[i * 2].count || 0,
        won: results[i * 2 + 1].count || 0,
    }));
}
