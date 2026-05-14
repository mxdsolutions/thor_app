import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { PublicPlan, BillingCycle } from "@/lib/plans-public";

interface PricingCardProps {
    plan: PublicPlan;
    cycle: BillingCycle;
}

export function PricingCard({ plan, cycle }: PricingCardProps) {
    const cents = cycle === "annual" ? plan.annual_cents : plan.monthly_cents;
    const monthlyEquivalent = cycle === "annual" ? Math.round(plan.annual_cents / 12) : null;
    const formattedPrice = formatCurrency(cents / 100).replace(/\.00$/, "");
    const formattedMonthly = monthlyEquivalent != null
        ? formatCurrency(monthlyEquivalent / 100).replace(/\.00$/, "")
        : null;

    return (
        <div
            className={cn(
                "relative rounded-2xl border p-8 flex flex-col",
                plan.highlight ? "border-black bg-black text-background" : "border-border bg-card",
            )}
        >
            {/* Italic recommendation caption — quieter than a pill */}
            {plan.highlight && (
                <p className="font-statement italic text-[13px] text-background/60 mb-2">
                    — Recommended
                </p>
            )}

            <h3 className={cn(
                "font-statement text-2xl font-semibold tracking-tight",
                plan.highlight ? "text-background" : "text-foreground",
            )}>
                {plan.name}
            </h3>
            <p className={cn("text-sm mt-1.5 leading-relaxed", plan.highlight ? "text-background/55" : "text-muted-foreground")}>
                {plan.tagline}
            </p>

            <div className="mt-7">
                <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                        "text-[44px] leading-none font-statement font-semibold tracking-tight tabular-nums",
                        plan.highlight ? "text-background" : "text-foreground",
                    )}>
                        {formattedPrice}
                    </span>
                    <span className={cn("text-sm", plan.highlight ? "text-background/50" : "text-muted-foreground")}>
                        / seat / {cycle === "annual" ? "yr" : "mo"}
                    </span>
                </div>
                {formattedMonthly && (
                    <p className={cn("text-xs mt-2 italic font-statement", plan.highlight ? "text-background/40" : "text-muted-foreground/70")}>
                        approx. {formattedMonthly} / seat / mo
                    </p>
                )}
            </div>

            <ul className="mt-7 space-y-3 flex-1">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[14px] leading-relaxed">
                        <span
                            aria-hidden
                            className={cn(
                                "mt-[9px] w-3 h-px shrink-0",
                                plan.highlight ? "bg-background/50" : "bg-foreground/40",
                            )}
                        />
                        <span className={plan.highlight ? "text-background/85" : "text-foreground/85"}>{feature}</span>
                    </li>
                ))}
            </ul>

            <div className={cn("mt-8 pt-6 border-t", plan.highlight ? "border-background/15" : "border-border")}>
                <Button
                    asChild
                    className={cn(
                        "w-full h-11 rounded-md text-[14px] font-medium",
                        plan.highlight && "bg-background text-foreground hover:bg-background/90",
                    )}
                    variant={plan.highlight ? undefined : "outline"}
                >
                    <Link href={`/signup?plan=${plan.id}`}>Begin 30-day trial</Link>
                </Button>
            </div>
        </div>
    );
}
