import "server-only";

// Single source of truth for the three subscription tiers and their Stripe
// price IDs. Used by:
//   - GET /api/tenant/subscription (empty-state pricing cards)
//   - POST /api/stripe/checkout (price_id whitelist)

export type PlanTier = "iron_ore" | "iron_oak" | "forged";
export type BillingCycle = "monthly" | "annual";

type EnvKey = `STRIPE_PRICE_${string}`;

const ENV_KEYS: Record<PlanTier, Record<BillingCycle, EnvKey>> = {
    iron_ore: { monthly: "STRIPE_PRICE_IRON_ORE_MONTHLY", annual: "STRIPE_PRICE_IRON_ORE_ANNUAL" },
    iron_oak: { monthly: "STRIPE_PRICE_IRON_OAK_MONTHLY", annual: "STRIPE_PRICE_IRON_OAK_ANNUAL" },
    forged: { monthly: "STRIPE_PRICE_FORGED_MONTHLY", annual: "STRIPE_PRICE_FORGED_ANNUAL" },
};

// Per-seat AUD prices in cents. Mirrored here so the empty-state pricing cards
// don't have to round-trip to Stripe. Keep this and the Stripe dashboard prices
// in sync — if you change one, change the other.
const PRICES: Record<PlanTier, Record<BillingCycle, number>> = {
    iron_ore: { monthly: 4900, annual: 49000 },
    iron_oak: { monthly: 9900, annual: 99000 },
    forged: { monthly: 12900, annual: 129000 },
};

const NAMES: Record<PlanTier, string> = {
    iron_ore: "Iron Ore",
    iron_oak: "Iron & Oak",
    forged: "Forged",
};

const TIER_ORDER: PlanTier[] = ["iron_ore", "iron_oak", "forged"];

export type PlanCycle = {
    price_id: string;
    amount_cents: number;
};

export type Plan = {
    id: PlanTier;
    name: string;
    monthly: PlanCycle;
    annual: PlanCycle;
};

export function getPlans(): Plan[] {
    return TIER_ORDER.map((id) => ({
        id,
        name: NAMES[id],
        monthly: {
            price_id: requireEnv(ENV_KEYS[id].monthly),
            amount_cents: PRICES[id].monthly,
        },
        annual: {
            price_id: requireEnv(ENV_KEYS[id].annual),
            amount_cents: PRICES[id].annual,
        },
    }));
}

export function isAllowedPriceId(priceId: string): boolean {
    return getPlans().some(
        (p) => p.monthly.price_id === priceId || p.annual.price_id === priceId,
    );
}

export function findPlanByPriceId(
    priceId: string,
): { plan: Plan; cycle: BillingCycle } | null {
    for (const plan of getPlans()) {
        if (plan.monthly.price_id === priceId) return { plan, cycle: "monthly" };
        if (plan.annual.price_id === priceId) return { plan, cycle: "annual" };
    }
    return null;
}

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is not configured`);
    return v;
}
