import Stripe from "stripe";

let cached: Stripe | null = null;

// Lazy so missing STRIPE_SECRET_KEY only fails at request time, not at build /
// page-data collection. Pinned to the SDK's default API version so the schema
// shape matches the typings that ship with the installed stripe@22.x.
export function getStripe(): Stripe {
    if (cached) return cached;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not set");
    }
    cached = new Stripe(secretKey, {
        apiVersion: "2026-04-22.dahlia",
        appInfo: {
            name: "THOR: Tradie OS",
            url: "https://admin.mxdsolutions.com.au",
        },
    });
    return cached;
}
