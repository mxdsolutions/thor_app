// Public-facing plan data — safe for client and prerendered pages.
// `lib/plans.ts` (server-only) layers on Stripe price IDs sourced from env vars
// and is what API routes / checkout uses. Keep tier ids and amounts in sync.

export type PlanTier = "iron_ore" | "iron_oak" | "forged";
export type BillingCycle = "monthly" | "annual";

export type PublicPlan = {
    id: PlanTier;
    name: string;
    tagline: string;
    monthly_cents: number;
    annual_cents: number;
    features: string[];
    highlight?: boolean; // "most popular"
};

export const PUBLIC_PLANS: PublicPlan[] = [
    {
        id: "iron_ore",
        name: "Iron Ore",
        tagline: "Solo tradies getting organised.",
        monthly_cents: 4900,
        annual_cents: 49000,
        features: [
            "Unlimited jobs, contacts, and companies",
            "Quotes, invoices, and receipts",
            "Mobile timesheets",
            "File storage",
            "Email support",
        ],
    },
    {
        id: "iron_oak",
        name: "Iron & Oak",
        tagline: "Growing crews running multiple jobs.",
        monthly_cents: 9900,
        annual_cents: 99000,
        highlight: true,
        features: [
            "Everything in Iron Ore",
            "Scheduling and team assignments",
            "Site reports with photos",
            "Purchase orders and pricing books",
            "Xero integration",
            "Priority support",
        ],
    },
    {
        id: "forged",
        name: "Forged",
        tagline: "Established businesses scaling operations.",
        monthly_cents: 12900,
        annual_cents: 129000,
        features: [
            "Everything in Iron & Oak",
            "Custom report templates",
            "Advanced analytics",
            "Outlook email integration",
            "Custom domain",
            "Dedicated onboarding",
        ],
    },
];

export function planById(id: PlanTier): PublicPlan {
    const plan = PUBLIC_PLANS.find((p) => p.id === id);
    if (!plan) throw new Error(`Unknown plan: ${id}`);
    return plan;
}

export function isValidPlanId(id: string): id is PlanTier {
    return PUBLIC_PLANS.some((p) => p.id === id);
}
