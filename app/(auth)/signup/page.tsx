"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { signUp } from "@/app/actions/auth";

export default function SignupPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("email", email);
        formData.append("password", password);

        try {
            const result = await signUp(formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.success);
            }
        } catch (err: any) {
            toast.error("An error occurred during sign up.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-black font-sans">Create Account</h1>
                    <p className="text-gray-500 font-sans">Start building with MXD</p>
                </div>

                <form className="space-y-4" onSubmit={handleSignup}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                            placeholder="John Doe"
                        />
                    </div>
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                            placeholder="Create password"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition-colors font-sans disabled:opacity-50"
                    >
                        {isLoading ? "Signing Up..." : "Sign Up"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500 font-sans">
                    Already have an account? <Link href="/" className="text-black font-semibold hover:underline">Log in</Link>
                </p>
            </div>
            <div className="mt-8">
                <Link href="/" className="text-sm text-gray-400 hover:text-black transition-colors font-sans">← Back to Home</Link>
            </div>
        </div>
    );
}
