import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        // Authenticate the request
        const authClient = await createClient();
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use admin client for cross-table aggregation (RLS may block anon reads)
        const supabase = await createAdminClient();

        // 1. Total Users
        const { count: totalUsers } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });

        // 2. New Users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: newUsers } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", thirtyDaysAgo.toISOString());

        // 3. Active Projects (status not completed)
        const { count: activeProjects } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .neq("status", "completed");

        // 3b. Total Projects
        const { count: totalProjects } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true });

        // 4. Active Jobs (status not completed or cancelled)
        const { count: activeJobs } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .not("status", "in", '("Completed","Cancelled","cancelled","completed")');

        // 4b. Total Jobs
        const { count: totalJobs } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true });

        // 5. Total Revenue (sum of completed jobs amount)
        const { data: completedJobs } = await supabase
            .from("jobs")
            .select("amount")
            .in("status", ["completed", "Completed"]);

        const totalRevenue = completedJobs?.reduce((sum, job) => sum + (job.amount || 0), 0) || 0;

        // 6. CRM metrics
        const { count: openLeads } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .not("status", "in", '("converted","unqualified")');

        const { count: totalLeads } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true });

        const { count: totalOpportunities } = await supabase
            .from("opportunities")
            .select("*", { count: "exact", head: true });

        const { data: pipelineData } = await supabase
            .from("opportunities")
            .select("value")
            .not("stage", "in", '("closed_won","closed_lost")');

        const pipelineValue = pipelineData?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

        // Won revenue this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: wonThisMonth } = await supabase
            .from("opportunities")
            .select("value")
            .in("stage", ["closed_won"])
            .gte("updated_at", monthStart.toISOString());

        const wonRevenueThisMonth = wonThisMonth?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

        // Monthly opportunity chart data (last 12 months)
        const chartMonths: { month: string; won: number; total: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.toISOString();
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
            const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

            const { count: totalCreated } = await supabase
                .from("opportunities")
                .select("*", { count: "exact", head: true })
                .gte("created_at", start)
                .lt("created_at", end);

            const { count: wonCount } = await supabase
                .from("opportunities")
                .select("*", { count: "exact", head: true })
                .in("stage", ["closed_won"])
                .gte("updated_at", start)
                .lt("updated_at", end);

            chartMonths.push({ month: label, won: wonCount || 0, total: totalCreated || 0 });
        }

        const { count: totalCompanies } = await supabase
            .from("companies")
            .select("*", { count: "exact", head: true });

        const { count: totalContacts } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true });

        // 7. Recent activity (last 5 jobs)
        const { data: recentTransactions } = await supabase
            .from("jobs")
            .select(`
                id,
                amount,
                status,
                updated_at,
                project:projects(title),
                assigned_to:profiles!jobs_assigned_to_fkey(full_name)
            `)
            .order("updated_at", { ascending: false })
            .limit(5);

        // 8. Active jobs for overview table
        const { data: activeJobsList } = await supabase
            .from("jobs")
            .select(`
                id,
                description,
                amount,
                status,
                scheduled_date,
                project:projects(title),
                assigned_to:profiles!jobs_assigned_to_fkey(full_name)
            `)
            .not("status", "in", '("Completed","Cancelled","cancelled","completed")')
            .order("scheduled_date", { ascending: true })
            .limit(10);

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                newUsers: newUsers || 0,
                activeProjects: activeProjects || 0,
                totalProjects: totalProjects || 0,
                activeJobs: activeJobs || 0,
                totalJobs: totalJobs || 0,
                totalRevenue: totalRevenue,
                openLeads: openLeads || 0,
                totalLeads: totalLeads || 0,
                totalOpportunities: totalOpportunities || 0,
                pipelineValue: pipelineValue,
                wonRevenueThisMonth: wonRevenueThisMonth,
                totalCompanies: totalCompanies || 0,
                totalContacts: totalContacts || 0,
                opportunityChart: chartMonths,
            },
            recentTransactions: recentTransactions?.map(t => ({
                id: t.id,
                user: t.assigned_to ? (t.assigned_to as any).full_name : "System",
                action: `Job: ${t.project ? (t.project as any).title : "Untitled Project"}`,
                amount: `$${((t.amount as number) || 0).toFixed(2)}`,
                status: t.status || "Unknown",
                date: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "Just now"
            })) || [],
            activeJobs: activeJobsList?.map(j => ({
                id: j.id,
                description: j.description,
                project: j.project ? (j.project as any).title : null,
                assignedTo: j.assigned_to ? (j.assigned_to as any).full_name : null,
                amount: j.amount || 0,
                status: j.status || "Unknown",
                scheduledDate: j.scheduled_date,
            })) || []
        });
    } catch (error: unknown) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
