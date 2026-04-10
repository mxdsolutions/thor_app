import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { scheduleEntrySchema, scheduleEntryUpdateSchema } from "@/lib/validation";

export const GET = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = supabase
        .from("job_schedule_entries")
        .select(`
            *,
            job:jobs (
                id,
                job_title,
                description,
                reference_id,
                status,
                amount,
                paid_status,
                total_payment_received,
                scheduled_date,
                created_at,
                company:companies(id, name),
                contact:contacts(id, first_name, last_name),
                service:products!jobs_service_id_fkey(id, name),
                assignees:job_assignees (
                    user:profiles (
                        id,
                        full_name,
                        email
                    )
                )
            )
        `)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });

    if (start) query = query.gte("date", start);
    if (end) query = query.lte("date", end);

    const { data, error } = await query;
    if (error) return serverError();

    return NextResponse.json({ items: data });
});

export const POST = withAuth(async (request, { supabase, user, tenantId }) => {
    const body = await request.json();
    const validation = scheduleEntrySchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { data, error } = await supabase
        .from("job_schedule_entries")
        .insert({
            ...validation.data,
            tenant_id: tenantId,
            created_by: user.id,
        })
        .select(`
            *,
            job:jobs (
                id,
                job_title,
                description,
                reference_id,
                status,
                amount,
                paid_status,
                total_payment_received,
                scheduled_date,
                created_at,
                company:companies(id, name),
                contact:contacts(id, first_name, last_name),
                service:products!jobs_service_id_fkey(id, name),
                assignees:job_assignees (
                    user:profiles (
                        id,
                        full_name,
                        email
                    )
                )
            )
        `)
        .single();

    if (error) return serverError();
    return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withAuth(async (request, { supabase, tenantId }) => {
    const body = await request.json();
    const validation = scheduleEntryUpdateSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("job_schedule_entries")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error) return serverError();
    return NextResponse.json({ item: data });
});

export const DELETE = withAuth(async (request, { supabase, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
        .from("job_schedule_entries")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (error) return serverError();
    return NextResponse.json({ success: true });
});
