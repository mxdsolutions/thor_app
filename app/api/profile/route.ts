import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { onboardingSchema } from "@/lib/validation";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: profile.full_name?.split(' ')[0] || "",
                lastName: profile.full_name?.split(' ').slice(1).join(' ') || "",
                role: profile.role
            }
        });
    } catch (error: unknown) {
        console.error("Profile API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        
        // Use centralized validation
        const validation = onboardingSchema.safeParse({
            first_name: body.firstName,
            last_name: body.lastName
        });

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Validation failed", 
                details: validation.error.flatten().fieldErrors 
            }, { status: 400 });
        }

        const { first_name, last_name } = validation.data;

        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                full_name: `${first_name} ${last_name}`.trim(),
            })
            .eq("id", user.id); // Secure: only update own profile

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
