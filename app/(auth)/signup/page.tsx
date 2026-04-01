"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tenantSignup } from "@/app/actions/tenantSignup";

export default function SignupPage() {
    const router = useRouter();
    const [companyName, setCompanyName] = useState("");
    const [slug, setSlug] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 48);
    };

    const handleCompanyNameChange = (value: string) => {
        setCompanyName(value);
        // Auto-generate slug from company name
        if (!slug || slug === generateSlug(companyName)) {
            setSlug(generateSlug(value));
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData();
        formData.append("company_name", companyName);
        formData.append("slug", slug);
        formData.append("full_name", fullName);
        formData.append("email", email);
        formData.append("password", password);

        try {
            const result = await tenantSignup(formData);
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success("Account created! Redirecting...");
                router.push("/dashboard");
            }
        } catch {
            toast.error("An error occurred during sign up.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-black font-sans">Create Your Workspace</h1>
                    <p className="text-gray-500 font-sans">Set up your company and start managing</p>
                </div>

                <form className="space-y-4" onSubmit={handleSignup}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Company Name</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => handleCompanyNameChange(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                            placeholder="Acme Corp"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Workspace URL</label>
                        <div className="flex items-center gap-0">
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                required
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                                placeholder="acme-corp"
                            />
                            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-sm text-gray-500 font-sans">
                                .{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "mxdplatform.com"}
                            </span>
                        </div>
                    </div>

                    <hr className="my-2 border-gray-100" />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">Your Full Name</label>
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
                            minLength={8}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-sans"
                            placeholder="Min. 8 characters"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition-colors font-sans disabled:opacity-50"
                    >
                        {isLoading ? "Creating workspace..." : "Create Workspace"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500 font-sans">
                    Already have an account? <Link href="/" className="text-black font-semibold hover:underline">Log in</Link>
                </p>
            </div>
            <div className="mt-8">
                <Link href="/" className="text-sm text-gray-400 hover:text-black transition-colors font-sans">Back to Home</Link>
            </div>
        </div>
    );
}
