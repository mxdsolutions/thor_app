"use client";

import { useState, useEffect } from "react";

const PLAN_DETAILS: Record<string, { label: string; description: string; users: string }> = {
    trial: { label: "Trial", description: "14-day free trial with full access", users: "Up to 5 users" },
    starter: { label: "Starter", description: "For small teams getting started", users: "Up to 10 users" },
    pro: { label: "Professional", description: "For growing businesses", users: "Up to 50 users" },
    enterprise: { label: "Enterprise", description: "Unlimited access for large organizations", users: "Unlimited users" },
};

type TenantData = {
    plan?: string | null;
    status?: string | null;
    max_users?: number | null;
    trial_ends_at?: string | null;
};

export default function SubscriptionPage() {
    const [tenantData, setTenantData] = useState<TenantData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tenant")
            .then(res => res.json())
            .then(data => setTenantData(data.tenant))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="px-6 lg:px-10 max-w-2xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-48" />
                    <div className="h-4 bg-muted rounded w-72" />
                    <div className="h-32 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    const plan = PLAN_DETAILS[tenantData?.plan || "trial"] || PLAN_DETAILS.trial;
    const trialEnds = tenantData?.trial_ends_at ? new Date(tenantData.trial_ends_at) : null;
    const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

    return (
        <div className="px-6 lg:px-10 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-xl font-bold tracking-tight">Subscription</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your workspace plan and billing
                </p>
            </div>

            <div className="space-y-6">
                {/* Current Plan */}
                <div className="border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">{plan.label}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase">
                            {tenantData?.status || "active"}
                        </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">User Limit</p>
                            <p className="text-sm font-semibold mt-0.5">{plan.users}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Max Users</p>
                            <p className="text-sm font-semibold mt-0.5">{tenantData?.max_users || 5}</p>
                        </div>
                    </div>

                    {daysLeft !== null && tenantData?.plan === "trial" && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${
                            daysLeft <= 3 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"
                        }`}>
                            {daysLeft > 0
                                ? `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                                : "Your trial has expired"
                            }
                        </div>
                    )}
                </div>

                {/* Upgrade CTA */}
                {tenantData?.plan !== "enterprise" && (
                    <div className="border border-border rounded-xl p-6 bg-muted/20">
                        <h3 className="text-sm font-semibold">Need more?</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Contact us to upgrade your plan or increase your user limit.
                        </p>
                        <a
                            href="mailto:support@mxdsolutions.com.au"
                            className="inline-block mt-3 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Contact Sales
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
