"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
            document.cookie = "auth_redirect=/reset-password; path=/; max-age=600; SameSite=Lax";

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Password reset instructions sent to your email.");
            }
        } catch {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-black font-sans">Reset Password</h1>
                    <p className="text-gray-500 font-sans">We&apos;ll send you instructions in an email</p>
                </div>

                <form className="space-y-4" onSubmit={handleReset}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                            placeholder="name@example.com"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition-colors font-sans disabled:opacity-50"
                    >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500 font-sans">
                    <Link href="/" className="text-black font-semibold hover:underline">Back to log in</Link>
                </p>
            </div>
        </div>
    );
}
