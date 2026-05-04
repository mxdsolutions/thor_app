import { Suspense } from "react";
import { getPlans } from "@/lib/plans";
import SignupFlow, { type ClientPlan } from "./SignupFlow";

export default function SignupPage() {
    const plans = getPlans();
    const clientPlans: ClientPlan[] = plans.map((p) => ({
        id: p.id,
        name: p.name,
        monthly: p.monthly,
        annual: p.annual,
    }));
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <SignupFlow plans={clientPlans} />
        </Suspense>
    );
}
