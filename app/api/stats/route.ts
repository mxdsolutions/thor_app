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

        // 4. Active Jobs (status not completed or cancelled)
        const { count: activeJobs } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .not("status", "in", '("Completed","Cancelled","cancelled","completed")');

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

        const { data: pipelineData } = await supabase
            .from("opportunities")
            .select("value")
            .not("stage", "in", '("closed_won","closed_lost")');

        const pipelineValue = pipelineData?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

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

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                newUsers: newUsers || 0,
                activeProjects: activeProjects || 0,
                activeJobs: activeJobs || 0,
                totalRevenue: totalRevenue,
                openLeads: openLeads || 0,
                pipelineValue: pipelineValue,
                totalCompanies: totalCompanies || 0,
                totalContacts: totalContacts || 0,
            },
            recentTransactions: recentTransactions?.map(t => ({
                id: t.id,
                user: t.assigned_to ? (t.assigned_to as any).full_name : "System",
                action: `Job: ${t.project ? (t.project as any).title : "Untitled Project"}`,
                amount: `$${((t.amount as number) || 0).toFixed(2)}`,
                status: t.status || "Unknown",
                date: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "Just now"
            })) || []
        });
    } catch (error: unknown) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
