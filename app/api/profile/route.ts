import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_lib/handler";
import { validationError, serverError } from "@/app/api/_lib/errors";
import { onboardingSchema } from "@/lib/validation";

export const GET = withAuth(async (_request, { supabase, user }) => {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileError) return serverError(profileError);

    return NextResponse.json({
        user: {
            id: user.id,
            email: user.email,
            firstName: profile.full_name?.split(' ')[0] || "",
            lastName: profile.full_name?.split(' ').slice(1).join(' ') || "",
            role: profile.role
        }
    });
});

export const PATCH = withAuth(async (request, { supabase, user }) => {
    const body = await request.json();

    const validation = onboardingSchema.safeParse({
        first_name: body.firstName,
        last_name: body.lastName
    });

    if (!validation.success) return validationError(validation.error);

    const { first_name, last_name } = validation.data;

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            full_name: `${first_name} ${last_name}`.trim(),
        })
        .eq("id", user.id);

    if (updateError) return serverError(updateError);

    return NextResponse.json({ success: true });
});
