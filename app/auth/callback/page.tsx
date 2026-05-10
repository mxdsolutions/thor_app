"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Signing you in…</p>
                </div>
            }
        >
            <CallbackBody />
        </Suspense>
    );
}

/**
 * Supabase Auth produces three different callback URL shapes:
 *
 *  1. PKCE        → `?code=…`         (most signin/recovery flows)
 *  2. OTP         → `?token_hash=…&type=…` (older email links)
 *  3. Implicit    → `#access_token=…&refresh_token=…&type=…`
 *                                       (current default for invite emails)
 *
 * The previous server-only route handler couldn't see fragment tokens
 * (case 3) because the browser doesn't send fragments to the server, so
 * invitees fell through to the auth-callback-failed branch. This client
 * page handles all three explicitly and stores the session via the
 * @supabase/ssr browser client (which also writes cookies, so the rest
 * of the app picks the session up on the next navigation).
 */
function CallbackBody() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function exchange() {
            const supabase = createClient();
            const code = searchParams.get("code");
            const tokenHash = searchParams.get("token_hash");
            const type = (searchParams.get("type") as EmailOtpType | null) ?? null;
            const next =
                searchParams.get("next") ??
                (type === "invite" ? "/onboarding" : "/dashboard");

            try {
                if (code) {
                    const { error: err } = await supabase.auth.exchangeCodeForSession(code);
                    if (err) throw err;
                } else if (tokenHash && type) {
                    const { error: err } = await supabase.auth.verifyOtp({
                        type,
                        token_hash: tokenHash,
                    });
                    if (err) throw err;
                } else if (typeof window !== "undefined" && window.location.hash) {
                    const hash = new URLSearchParams(window.location.hash.slice(1));
                    const accessToken = hash.get("access_token");
                    const refreshToken = hash.get("refresh_token");
                    if (!accessToken || !refreshToken) {
                        throw new Error("Missing access/refresh token in callback");
                    }
                    const { error: err } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (err) throw err;
                } else {
                    throw new Error("No auth credentials in callback URL");
                }

                if (cancelled) return;
                router.replace(next);
            } catch (err) {
                if (cancelled) return;
                console.error("[auth/callback] exchange failed:", err);
                setError(err instanceof Error ? err.message : "Authentication failed");
            }
        }

        void exchange();
        return () => {
            cancelled = true;
        };
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <p className="text-rose-600 font-semibold mb-2">Sign-in failed</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <p className="text-xs text-muted-foreground mt-4">
                        The invite link may have expired. Ask the person who invited
                        you to resend it.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
    );
}
