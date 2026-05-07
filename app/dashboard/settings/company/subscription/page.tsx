"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePermissionOptional } from "@/lib/tenant-context";
import {
    useTenantSubscription,
    type SeatUsageJson,
    type SubscriptionPlan,
    type TenantSubscription,
} from "@/lib/swr";
import { cn, formatCurrency } from "@/lib/utils";
import { sectionHeadingClass } from "@/lib/design-system";
import { AddSeatsModal } from "@/components/modals/AddSeatsModal";

export default function SubscriptionPage() {
    return (
        <Suspense>
            <SubscriptionContent />
        </Suspense>
    );
}

function SubscriptionContent() {
    const { data, isLoading, mutate } = useTenantSubscription();
    const canWrite = usePermissionOptional("settings.subscription", "write", false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const checkout = searchParams.get("checkout");
        if (!checkout) return;

        // Strip the query param so a refresh / back-nav doesn't re-fire the toast.
        router.replace("/dashboard/settings/company/subscription");

        if (checkout === "success") {
            toast.success("Subscription activated. It may take a few seconds to appear.");
            mutate();
            // Webhook is async — re-poll a couple of times so the page updates
            // once `tenant_subscriptions` has the new row.
            const t1 = setTimeout(() => mutate(), 2000);
            const t2 = setTimeout(() => mutate(), 6000);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
        if (checkout === "cancelled") {
            toast.message("Checkout cancelled. No charges were made.");
        }
    }, [searchParams, mutate, router]);

    if (isLoading || !data) {
        return (
            <div className="space-y-4">
                <Card className="border-border shadow-none rounded-2xl">
                    <CardContent className="p-6">
                        <div className="h-5 w-40 bg-muted/50 animate-pulse rounded" />
                        <div className="mt-4 h-4 w-72 bg-muted/40 animate-pulse rounded" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { subscription, plans, eligible_for_trial, billing_exempt, usage } = data;
    const showActive = subscription && subscription.status !== "canceled" && subscription.status !== "incomplete_expired";

    return (
        <div className="space-y-4">
            {showActive ? (
                <ActiveState
                    subscription={subscription}
                    plans={plans}
                    canWrite={canWrite}
                    onChange={mutate}
                    billingExempt={billing_exempt}
                    usage={usage}
                />
            ) : (
                <EmptyState
                    plans={plans}
                    canWrite={canWrite}
                    eligibleForTrial={eligible_for_trial}
                    previouslySubscribed={subscription?.status === "canceled" || subscription?.status === "incomplete_expired"}
                />
            )}
        </div>
    );
}

// --------------------------------------------------------------------------
// Active state — current plan summary + manage-billing CTA
// --------------------------------------------------------------------------

function ActiveState({
    subscription,
    plans,
    canWrite,
    onChange,
    billingExempt,
    usage,
}: {
    subscription: TenantSubscription;
    plans: SubscriptionPlan[];
    canWrite: boolean;
    onChange: () => void;
    billingExempt: boolean;
    usage: SeatUsageJson;
}) {
    const matched = findPlan(subscription.stripe_price_id, plans);
    const planName = matched?.plan.name ?? "Custom plan";
    const cycle = matched?.cycle ?? "monthly";
    const perSeat = matched ? matched.cycle === "monthly"
        ? matched.plan.monthly.amount_cents
        : matched.plan.annual.amount_cents
        : null;

    const total = perSeat ? perSeat * subscription.quantity : null;
    const cycleLabel = cycle === "annual" ? "year" : "month";
    const [showAddSeats, setShowAddSeats] = useState(false);

    // Stripe's subscription.updated webhook lands ~1–2s after our seats POST
    // returns. Re-poll a couple of times so the UI converges without the user
    // needing to refresh — same pattern as the checkout-success handler.
    const handleSeatsAdded = useCallback(() => {
        onChange();
        const t1 = setTimeout(() => onChange(), 2000);
        const t2 = setTimeout(() => onChange(), 6000);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [onChange]);

    return (
        <>
            {!billingExempt && (
                <StatusBanner subscription={subscription} canWrite={canWrite} onChange={onChange} />
            )}

            <Card className="border-border shadow-none rounded-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <h3 className={sectionHeadingClass}>{planName}</h3>
                                {billingExempt ? (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-1.5" />
                                        Internal
                                    </Badge>
                                ) : (
                                    <StatusBadge status={subscription.status} />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {billingExempt
                                    ? "Complimentary account — full access, no billing."
                                    : `Per-seat plan billed ${cycle === "annual" ? "annually" : "monthly"}.`}
                            </p>
                        </div>
                        {canWrite && !billingExempt && (
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() => setShowAddSeats(true)}
                                    >
                                        Add seats
                                    </Button>
                                </div>
                                <div className="flex-1 sm:flex-none">
                                    <ManageBillingButton onChange={onChange} className="w-full sm:w-auto" />
                                </div>
                            </div>
                        )}
                    </div>

                    {billingExempt ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                            <SummaryStat label="Tier" value={planName} />
                            <SummaryStat label="Active members" value={String(usage.used)} />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                                <SummaryStat
                                    label="Per seat"
                                    value={perSeat != null ? `${formatCurrency(perSeat / 100)} / ${cycleLabel}` : "—"}
                                />
                                <SeatUsageStat usage={usage} quantity={subscription.quantity} />
                                <SummaryStat
                                    label={`Total / ${cycleLabel}`}
                                    value={total != null ? formatCurrency(total / 100) : "—"}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
                                <SummaryStat
                                    label={subscription.cancel_at_period_end ? "Access ends" : subscription.status === "trialing" ? "Trial ends" : "Renews on"}
                                    value={formatDate(subscription.status === "trialing" ? subscription.trial_end : subscription.current_period_end)}
                                />
                                <SummaryStat
                                    label="Status"
                                    value={prettyStatus(subscription.status)}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {!canWrite && !billingExempt && (
                <p className="px-1 text-xs text-muted-foreground">
                    Only owners and admins can change the plan or manage billing.
                </p>
            )}

            {!billingExempt && perSeat != null && (
                <AddSeatsModal
                    open={showAddSeats}
                    onOpenChange={setShowAddSeats}
                    currentQuantity={subscription.quantity}
                    perSeatCents={perSeat}
                    cycleLabel={cycleLabel as "month" | "year"}
                    onAdded={handleSeatsAdded}
                />
            )}
        </>
    );
}

function SeatUsageStat({ usage, quantity }: { usage: SeatUsageJson; quantity: number }) {
    const used = usage.used;
    const available = usage.available;
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seats</div>
            <div className="mt-1 text-sm font-medium">
                {used} of {quantity} used
            </div>
            {available != null && (
                <div className="text-xs text-muted-foreground">
                    {available === 0 ? "No seats available" : `${available} available`}
                </div>
            )}
        </div>
    );
}

function StatusBanner({
    subscription,
    canWrite,
    onChange,
}: {
    subscription: TenantSubscription;
    canWrite: boolean;
    onChange: () => void;
}) {
    if (subscription.status === "past_due" || subscription.status === "unpaid") {
        return (
            <Card className="border-rose-200 bg-rose-50 shadow-none rounded-2xl">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-base font-semibold text-rose-900">
                                {subscription.status === "unpaid" ? "Subscription locked" : "Payment failed"}
                            </h4>
                            <p className="text-sm text-rose-700 mt-0.5">
                                {subscription.status === "unpaid"
                                    ? "Your account is restricted until billing is updated. Update your payment method to restore access."
                                    : "We couldn't charge your card. Update your payment method before your next retry."}
                            </p>
                        </div>
                        {canWrite && <ManageBillingButton onChange={onChange} variant="default" />}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (subscription.cancel_at_period_end) {
        return (
            <Card className="border-amber-200 bg-amber-50 shadow-none rounded-2xl">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-base font-semibold text-amber-900">Cancellation scheduled</h4>
                            <p className="text-sm text-amber-800 mt-0.5">
                                Your plan will end on {formatDate(subscription.current_period_end)}. You can reactivate from the billing portal.
                            </p>
                        </div>
                        {canWrite && <ManageBillingButton onChange={onChange} />}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (subscription.status === "trialing" && subscription.trial_end) {
        const daysLeft = Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86400000));
        return (
            <Card className="border-border bg-muted/30 shadow-none rounded-2xl">
                <CardContent className="p-5">
                    <div>
                        <h4 className="text-base font-semibold">Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Your card will be charged on {formatDate(subscription.trial_end)} unless you cancel before then.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}

function StatusBadge({ status }: { status: TenantSubscription["status"] }) {
    const dotColor = STATUS_DOT[status] ?? "bg-muted-foreground";
    return (
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
            {prettyStatus(status)}
        </Badge>
    );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
    );
}

function ManageBillingButton({ onChange, variant = "outline", className }: { onChange: () => void; variant?: "outline" | "default"; className?: string }) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.url) {
                toast.error(body?.error ?? "Couldn't open the billing portal");
                return;
            }
            window.location.assign(body.url);
        } catch {
            toast.error("Couldn't open the billing portal");
        } finally {
            setLoading(false);
            onChange();
        }
    };

    return (
        <Button
            size="sm"
            variant={variant === "default" ? "default" : "outline"}
            onClick={handleClick}
            disabled={loading}
            className={cn("shrink-0", className)}
        >
            {loading ? "Opening..." : "Manage Billing"}
        </Button>
    );
}

// --------------------------------------------------------------------------
// Empty state — pricing cards
// --------------------------------------------------------------------------

function EmptyState({
    plans,
    canWrite,
    eligibleForTrial,
    previouslySubscribed,
}: {
    plans: SubscriptionPlan[];
    canWrite: boolean;
    eligibleForTrial: boolean;
    previouslySubscribed: boolean;
}) {
    const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className={sectionHeadingClass}>
                        {previouslySubscribed ? "Reactivate your subscription" : "Choose a plan"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Per-seat pricing. {eligibleForTrial && "Start with a 30-day free trial — no card charged until day 30."}
                    </p>
                </div>
                <CycleToggle value={cycle} onChange={setCycle} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        cycle={cycle}
                        canWrite={canWrite}
                        eligibleForTrial={eligibleForTrial}
                        highlight={plan.id === "iron_oak"}
                    />
                ))}
            </div>

            {!canWrite && (
                <p className="px-1 text-xs text-muted-foreground">
                    Only owners and admins can start a subscription.
                </p>
            )}
        </>
    );
}

function CycleToggle({ value, onChange }: { value: "monthly" | "annual"; onChange: (v: "monthly" | "annual") => void }) {
    return (
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
            {(["monthly", "annual"] as const).map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${value === opt ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                    {opt === "monthly" ? "Monthly" : "Annual · 2 months free"}
                </button>
            ))}
        </div>
    );
}

function PlanCard({
    plan,
    cycle,
    canWrite,
    eligibleForTrial,
    highlight,
}: {
    plan: SubscriptionPlan;
    cycle: "monthly" | "annual";
    canWrite: boolean;
    eligibleForTrial: boolean;
    highlight: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const cycleData = cycle === "annual" ? plan.annual : plan.monthly;
    const monthlyEquivalent = cycle === "annual" ? Math.round(plan.annual.amount_cents / 12) : null;

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price_id: cycleData.price_id }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.url) {
                toast.error(body?.error ?? "Couldn't start checkout");
                setLoading(false);
                return;
            }
            window.location.assign(body.url);
        } catch {
            toast.error("Couldn't start checkout");
            setLoading(false);
        }
    };

    return (
        <Card className={`border-border shadow-none rounded-2xl ${highlight ? "ring-1 ring-foreground" : ""}`}>
            <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-1">
                    <h3 className={sectionHeadingClass}>{plan.name}</h3>
                    {highlight && (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                            Most popular
                        </Badge>
                    )}
                </div>
                <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-semibold">
                            {formatCurrency(cycleData.amount_cents / 100).replace(/\.00$/, "")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / seat / {cycle === "annual" ? "year" : "month"}
                        </span>
                    </div>
                    {monthlyEquivalent != null && (
                        <p className="text-xs text-muted-foreground mt-1">
                            ≈ {formatCurrency(monthlyEquivalent / 100).replace(/\.00$/, "")} per seat per month
                        </p>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                    {canWrite ? (
                        <Button
                            size="sm"
                            className="w-full"
                            variant={highlight ? "default" : "outline"}
                            onClick={handleSubscribe}
                            disabled={loading}
                        >
                            {loading ? "Starting..." : eligibleForTrial ? "Start 30-day trial" : "Subscribe"}
                        </Button>
                    ) : (
                        <Button size="sm" className="w-full" variant="outline" disabled>
                            Owner-only
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const STATUS_DOT: Record<TenantSubscription["status"], string> = {
    trialing: "bg-blue-500",
    active: "bg-emerald-500",
    past_due: "bg-rose-500",
    unpaid: "bg-rose-500",
    canceled: "bg-muted-foreground",
    incomplete: "bg-amber-500",
    incomplete_expired: "bg-muted-foreground",
    paused: "bg-amber-500",
};

function prettyStatus(status: TenantSubscription["status"]): string {
    switch (status) {
        case "trialing": return "Trial";
        case "active": return "Active";
        case "past_due": return "Past due";
        case "unpaid": return "Locked";
        case "canceled": return "Cancelled";
        case "incomplete": return "Pending";
        case "incomplete_expired": return "Expired";
        case "paused": return "Paused";
    }
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function findPlan(
    priceId: string | null,
    plans: SubscriptionPlan[],
): { plan: SubscriptionPlan; cycle: "monthly" | "annual" } | null {
    if (!priceId) return null;
    for (const plan of plans) {
        if (plan.monthly.price_id === priceId) return { plan, cycle: "monthly" };
        if (plan.annual.price_id === priceId) return { plan, cycle: "annual" };
    }
    return null;
}
