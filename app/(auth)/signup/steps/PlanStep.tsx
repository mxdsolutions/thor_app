"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { ClientPlan } from "../SignupFlow";

interface Props {
    plans: ClientPlan[];
    billingCycle: "monthly" | "annual";
    setBillingCycle: (cycle: "monthly" | "annual") => void;
    isSubmitting: boolean;
    tenantId: string | null;
    onCheckout: (priceId: string) => void;
}

export function PlanStep({ plans, billingCycle, setBillingCycle, isSubmitting, tenantId, onCheckout }: Props) {
    return (
        <motion.div
            key="plan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-4xl space-y-8"
        >
            <div className="text-center space-y-3">
                <h2 className="font-statement text-4xl md:text-5xl text-white tracking-tight">
                    Choose your plan
                </h2>
                <p className="text-white/50 text-base">
                    Start with a 30-day free trial. No card charged until day 30.
                </p>
            </div>

            <div className="flex justify-center">
                <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
                    {(["monthly", "annual"] as const).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setBillingCycle(opt)}
                            className={cn(
                                "px-4 h-8 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors",
                                billingCycle === opt ? "bg-white text-black" : "text-white/50 hover:text-white",
                            )}
                        >
                            {opt === "monthly" ? "Monthly" : "Annual · Save 17%"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                    const cycleData = billingCycle === "annual" ? plan.annual : plan.monthly;
                    const monthlyEq = billingCycle === "annual"
                        ? Math.round(plan.annual.amount_cents / 12)
                        : null;
                    const highlight = plan.id === "iron_oak";
                    return (
                        <div
                            key={plan.id}
                            className={cn(
                                "relative rounded-2xl border p-7 flex flex-col transition-colors",
                                highlight ? "border-white bg-white/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20",
                            )}
                        >
                            {highlight && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black rounded-md">
                                        Most popular
                                    </span>
                                </div>
                            )}

                            <h3 className="font-display text-2xl text-white">{plan.name}</h3>

                            <div className="mt-6">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-display font-semibold text-white">
                                        {formatCurrency(cycleData.amount_cents / 100).replace(/\.00$/, "")}
                                    </span>
                                    <span className="text-sm text-white/40">
                                        / seat / {billingCycle === "annual" ? "yr" : "mo"}
                                    </span>
                                </div>
                                {monthlyEq != null && (
                                    <p className="text-xs text-white/30 mt-1">
                                        ≈ {formatCurrency(monthlyEq / 100).replace(/\.00$/, "")} / seat / mo
                                    </p>
                                )}
                            </div>

                            <div className="mt-7 pt-6 border-t border-white/10">
                                <Button
                                    size="lg"
                                    className={cn(
                                        "w-full",
                                        highlight
                                            ? "bg-white text-black hover:bg-white/90"
                                            : "bg-white/10 text-white border border-white/15 hover:bg-white/20",
                                    )}
                                    disabled={isSubmitting || !tenantId}
                                    onClick={() => onCheckout(cycleData.price_id)}
                                >
                                    {isSubmitting ? "Starting..." : "Start 30-day trial"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-center text-xs text-white/30">
                You&apos;ll be redirected to Stripe to enter payment details.
            </p>
        </motion.div>
    );
}
