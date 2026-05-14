import type { Metadata } from "next";
import { PricingPageClient } from "./PricingPageClient";

export const metadata: Metadata = {
    title: "Pricing — THOR",
    description:
        "Per-seat pricing for THOR. Three plans, all with unlimited jobs, contacts, and projects. 30-day free trial, no card required.",
};

export default function PricingPage() {
    return <PricingPageClient />;
}
