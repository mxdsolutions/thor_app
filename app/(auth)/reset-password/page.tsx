"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThorWordmark } from "@/components/ThorWordmark";
import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

const inputClass =
    "h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white/40 transition-all rounded-lg";
const primaryBtnClass = "bg-white text-foreground hover:bg-white/90";
const labelClass =
    "text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em]";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Verify the user has a valid recovery session before showing the form.
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error("Invalid or expired reset link. Please request a new one.");
                router.replace("/forgot-password");
            } else {
                setIsAuthorized(true);
            }
        });
    }, [router]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append("password", password);

        try {
            const result = await updatePassword(formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                // Sign out the recovery session so the user can log in fresh
                // with their new password — avoids the middleware admin check
                // failing on recovery session tokens.
                const supabase = createClient();
                await supabase.auth.signOut();
                toast.success("Password updated! Please sign in with your new password.");
                router.push("/login");
            }
        } catch {
            toast.error("An error occurred updating the password.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-foreground flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-foreground flex items-center justify-center text-white px-6 py-12">
            <div className="w-full max-w-md flex flex-col items-stretch gap-10">
                <div className="flex flex-col items-center gap-6">
                    <ThorWordmark size={44} />
                </div>

                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="font-statement text-3xl md:text-4xl tracking-tight text-white">
                            Set a new password
                        </h1>
                        <p className="text-sm md:text-base text-white/55">
                            Choose a password you haven&apos;t used before.
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleUpdate}>
                        <div className="space-y-2">
                            <label className={labelClass} htmlFor="password">
                                New password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                autoFocus
                                data-no-focus-style
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass} htmlFor="confirm">
                                Confirm password
                            </label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Repeat your password"
                                autoComplete="new-password"
                                data-no-focus-style
                                className={inputClass}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !password || !confirmPassword}
                            className={`w-full h-12 ${primaryBtnClass}`}
                        >
                            {isLoading ? "Updating…" : "Update password"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
