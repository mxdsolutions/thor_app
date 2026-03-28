import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lineItemSchema, lineItemUpdateSchema } from "@/lib/validation";

async function recalcOpportunityValue(supabase: any, opportunityId: string) {
    const { data: items } = await supabase
        .from("opportunity_line_items")
        .select("quantity, unit_price")
        .eq("opportunity_id", opportunityId);

    const total = (items || []).reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
            sum + item.quantity * item.unit_price,
        0
    );

    await supabase
        .from("opportunities")
        .update({ value: total, updated_at: new Date().toISOString() })
        .eq("id", opportunityId);

    return total;
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
    if (!opportunityId) {
        return NextResponse.json({ error: "opportunity_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("opportunity_line_items")
        .select(`
            *,
            product:products (
                id,
                name
            )
        `)
        .eq("opportunity_id", opportunityId)
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

    const { data, error } = await supabase
        .from("opportunity_line_items")
        .insert(validation.data)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    let newTotal: number | undefined;
    if (validation.data.opportunity_id) {
        newTotal = await recalcOpportunityValue(supabase, validation.data.opportunity_id);
    }

    return NextResponse.json({ lineItem: data, opportunityValue: newTotal ?? null }, { status: 201 });
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
        .from("opportunity_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, product:products (id, name)`)
        .single();

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const newTotal = await recalcOpportunityValue(supabase, data.opportunity_id);

    return NextResponse.json({ lineItem: data, opportunityValue: newTotal });
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

    // Get the opportunity_id before deleting
    const { data: item } = await supabase
        .from("opportunity_line_items")
        .select("opportunity_id")
        .eq("id", id)
        .single();

    if (!item) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("opportunity_line_items")
        .delete()
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const newTotal = await recalcOpportunityValue(supabase, item.opportunity_id);

    return NextResponse.json({ success: true, opportunityValue: newTotal });
}
