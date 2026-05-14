"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThorWordmark } from "@/components/ThorWordmark";
import { createClient } from "@/lib/supabase/client";

const inputClass =
    "h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white/40 transition-all rounded-lg";
const primaryBtnClass = "bg-white text-foreground hover:bg-white/90";
const labelClass =
    "text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em]";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // MUST use browser client so Supabase stores the PKCE code_verifier
            // locally before sending the email — server actions cannot do this.
            const supabase = createClient();

            // Store intended destination in a cookie — Supabase's PKCE redirect
            // chain strips custom query params from redirectTo, so the callback
            // reads this cookie as a fallback.
            document.cookie =
                "auth_redirect=/reset-password; path=/; max-age=600; SameSite=Lax";

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Password reset instructions sent to your email.");
                setSent(true);
            }
        } catch {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-foreground flex items-center justify-center text-white px-6 py-12">
            <div className="w-full max-w-md flex flex-col items-stretch gap-10">
                <div className="flex flex-col items-center gap-6">
                    <ThorWordmark size={44} />
                </div>

                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="font-statement text-3xl md:text-4xl tracking-tight text-white">
                            Reset your password
                        </h1>
                        <p className="text-sm md:text-base text-white/55">
                            Enter your email and we&apos;ll send you a reset link.
                        </p>
                    </div>

                    {sent ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center space-y-2">
                            <p className="text-white font-medium">Check your inbox.</p>
                            <p className="text-sm text-white/55">
                                We&apos;ve sent reset instructions to <span className="text-white">{email}</span>.
                                The link expires in 1 hour.
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleReset}>
                            <div className="space-y-2">
                                <label className={labelClass} htmlFor="email">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@company.com"
                                    autoComplete="email"
                                    autoFocus
                                    data-no-focus-style
                                    className={inputClass}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading || !email}
                                className={`w-full h-12 ${primaryBtnClass}`}
                            >
                                {isLoading ? "Sending…" : "Send reset link"}
                            </Button>
                        </form>
                    )}

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
