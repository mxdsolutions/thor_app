import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
}

// Pinned to the SDK's default API version so schema shape matches the typings
// that ship with the installed stripe@22.x. Bumping the SDK bumps this together.
export const stripe = new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    appInfo: {
        name: "THOR: Tradie OS",
        url: "https://admin.mxdsolutions.com.au",
    },
});
