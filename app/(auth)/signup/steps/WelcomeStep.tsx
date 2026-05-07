"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconArrowRight as ArrowRightIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { primaryBtnClass, stepEyebrowClass } from "./styles";

export function WelcomeStep({ onStart }: { onStart: () => void }) {
    return (
        <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg text-center space-y-10"
        >
            <div className="space-y-6">
                <div className="flex items-center justify-center gap-3">
                    <span className="h-px w-8 bg-white/15" />
                    <p className={stepEyebrowClass}>Welcome to THOR</p>
                    <span className="h-px w-8 bg-white/15" />
                </div>
                <h1 className="font-display text-5xl md:text-7xl font-semibold text-white leading-[0.95] tracking-tight">
                    Built for teams<br />
                    <span className="text-white/50">that build things.</span>
                </h1>
                <p className="text-base md:text-lg text-white/50 max-w-md mx-auto leading-relaxed">
                    Quote, schedule, invoice, manage and grow without juggling six different tools.
                </p>
            </div>

            <div className="space-y-4">
                <Button size="lg" className={cn("h-12 px-8 text-base", primaryBtnClass)} onClick={onStart}>
                    Set up your workspace
                    <ArrowRightIcon className="ml-2 w-4 h-4" />
                </Button>
                <p className="text-xs text-white/30">
                    30-day free trial · Card not charged until day 30
                </p>
            </div>

            <p className="text-sm text-white/40">
                Already have an account?{" "}
                <Link href="/" className="text-white font-semibold hover:underline">
                    Log in
                </Link>
            </p>
        </motion.div>
    );
}
