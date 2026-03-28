import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lineItemSchema, lineItemUpdateSchema } from "@/lib/validation";

async function recalcJobAmount(supabase: any, jobId: string) {
    const { data: items } = await supabase
        .from("job_line_items")
        .select("quantity, unit_price")
        .eq("job_id", jobId);

    const total = (items || []).reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
            sum + item.quantity * item.unit_price,
        0
    );

    await supabase
        .from("jobs")
        .update({ amount: total, updated_at: new Date().toISOString() })
        .eq("id", jobId);

    return total;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("job_id");
    if (!jobId) {
        return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("job_line_items")
        .select(`
            *,
            product:products (
                id,
                name
            )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ lineItems: data });
}

export async function POST(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = lineItemSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { job_id, product_id, quantity, unit_price } = validation.data;
    if (!job_id) {
        return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("job_line_items")
        .insert({ job_id, product_id, quantity, unit_price })
        .select(`*, product:products (id, name)`)
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const newTotal = await recalcJobAmount(supabase, job_id);

    return NextResponse.json({ lineItem: data, jobAmount: newTotal }, { status: 201 });
}

export async function PATCH(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = lineItemUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, ...updates } = validation.data;

    const { data, error } = await supabase
        .from("job_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const newTotal = await recalcJobAmount(supabase, data.job_id);

    return NextResponse.json({ lineItem: data, jobAmount: newTotal });
}

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: item } = await supabase
        .from("job_line_items")
        .select("job_id")
        .eq("id", id)
        .single();

    if (!item) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("job_line_items")
        .delete()
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const newTotal = await recalcJobAmount(supabase, item.job_id);

    return NextResponse.json({ success: true, jobAmount: newTotal });
}
