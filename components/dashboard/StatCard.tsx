"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { statLabelClass, statValueClass } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string;
    /** Secondary line shown below the value — e.g. "12 quotes" beside a $ value. */
    sublabel?: ReactNode;
    href?: string | null;
    className?: string;
}

/**
 * Flat stat-card wrapper for overview-style metric tiles.
 * Uses `shadow-none` deliberately — the industrial aesthetic favors
 * flat surfaces over shadowed cards.
 */
export function StatCard({ label, value, sublabel, href, className }: StatCardProps) {
    const card = (
        <Card
            className={cn(
                "border-border shadow-none rounded-2xl h-full",
                href && "hover:bg-secondary/40 transition-colors cursor-pointer",
                className
            )}
        >
            <CardContent className="p-4 md:p-5">
                <span className={statLabelClass}>{label}</span>
                <h3 className={cn(statValueClass, "mt-2")}>{value}</h3>
                {sublabel && (
                    <span className="block text-xs text-muted-foreground mt-1 tabular-nums">{sublabel}</span>
                )}
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {card}
            </Link>
        );
    }

    return card;
}
