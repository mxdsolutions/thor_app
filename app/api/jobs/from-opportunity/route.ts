import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { jobFromOpportunitySchema } from "@/lib/validation";

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = jobFromOpportunitySchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { opportunity_id, description, company_id, assigned_to, line_items } = validation.data;

    const totalAmount = line_items.reduce(
        (sum, li) => sum + li.quantity * li.unit_price,
        0
    );

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
            tenant_id: tenantId,
        })
        .select()
        .single();

    if (jobError || !job) return serverError();

    const jobLineItems = line_items.map(li => ({
        job_id: job.id,
        product_id: li.product_id,
        quantity: li.quantity,
        unit_price: li.unit_price,
        tenant_id: tenantId,
    }));

    const projects = line_items.map(li => ({
        title: li.product_name,
        company_id,
        job_id: job.id,
        status: "pending",
        created_by: user.id,
        tenant_id: tenantId,
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
});
