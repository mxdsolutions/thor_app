import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobFromOpportunitySchema } from "@/lib/validation";

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = jobFromOpportunitySchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { opportunity_id, description, company_id, assigned_to, line_items } = validation.data;

    // Calculate total amount from line items
    const totalAmount = line_items.reduce(
        (sum, li) => sum + li.quantity * li.unit_price,
        0
    );

    // 1. Create the job
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
            description,
            amount: totalAmount,
            company_id,
            opportunity_id,
            assigned_to: assigned_to || null,
            status: "new",
            created_by: user.id,
        })
        .select()
        .single();

    if (jobError || !job) {
        return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // 2. Create job line items and projects in parallel
    const jobLineItems = line_items.map(li => ({
        job_id: job.id,
        product_id: li.product_id,
        quantity: li.quantity,
        unit_price: li.unit_price,
    }));

    const projects = line_items.map(li => ({
        title: li.product_name,
        company_id,
        job_id: job.id,
        status: "pending",
        created_by: user.id,
    }));

    await Promise.all([
        jobLineItems.length > 0
            ? supabase.from("job_line_items").insert(jobLineItems)
            : Promise.resolve(),
        projects.length > 0
            ? supabase.from("projects").insert(projects)
            : Promise.resolve(),
    ]);

    return NextResponse.json({ job }, { status: 201 });
}
