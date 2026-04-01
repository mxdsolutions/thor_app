import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildXeroAuthUrl } from "@/lib/xero";
import { v4 as uuid } from "uuid";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = uuid();
    const cookieStore = await cookies();
    cookieStore.set("xero_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });

    const authUrl = buildXeroAuthUrl(state);
    return NextResponse.redirect(authUrl);
}
