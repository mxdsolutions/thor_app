"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WaitlistForm() {
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.includes("@")) {
            toast.error("Please enter a valid email");
            return;
        }
        setSubmitting(true);
        try {
            await new Promise((r) => setTimeout(r, 500));
            setSubmitted(true);
            toast.success("You're on the list.");
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return (
            <div className="text-center">
                <p className="font-statement italic text-lg text-white/80">
                    You&apos;re on the list.
                </p>
                <p className="mt-1 text-[13px] text-white/45">
                    We&apos;ll be in touch when early access opens.
                </p>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2.5 w-full"
        >
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourtrade.com.au"
                aria-label="Email address"
                autoComplete="email"
                required
                className="flex-1 h-12 px-4 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/35 text-[14px] focus:outline-none focus:border-white/35 focus:bg-white/10 transition"
            />
            <Button
                type="submit"
                disabled={submitting}
                className="h-12 px-6 rounded-lg text-[14px] font-medium bg-white text-foreground hover:bg-white/90"
            >
                {submitting ? "Joining…" : "Join the Waiting List"}
                <ArrowRight className="ml-2 w-3.5 h-3.5" />
            </Button>
        </form>
    );
}
