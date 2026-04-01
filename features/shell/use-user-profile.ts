"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export function useUserProfile() {
    const { data } = useSWR("user-profile", async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
        return profile;
    }, { revalidateOnFocus: false, dedupingInterval: 60000 });

    const profile = data || null;

    const initials = (() => {
        const name = profile?.full_name;
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        return parts.map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
    })();

    return {
        profile,
        initials,
        displayName: profile?.full_name || "User",
        email: profile?.email || "",
    };
}
