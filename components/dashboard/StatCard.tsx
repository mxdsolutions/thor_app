"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { statLabelClass, statValueClass } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string;
    href?: string | null;
    className?: string;
}

/**
 * Flat stat-card wrapper for overview-style metric tiles.
 * Uses `shadow-none` deliberately — the industrial aesthetic favors
 * flat surfaces over shadowed cards.
 */
export function StatCard({ label, value, href, className }: StatCardProps) {
    const card = (
        <Card
            className={cn(
                "border-border shadow-none rounded-2xl shrink-0 min-w-[140px] flex-1",
                href && "hover:bg-secondary/40 transition-colors cursor-pointer",
                className
            )}
        >
            <CardContent className="p-4 md:p-5">
                <span className={statLabelClass}>{label}</span>
                <h3 className={cn(statValueClass, "mt-2")}>{value}</h3>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="shrink-0 min-w-[140px] flex-1">
                {card}
            </Link>
        );
    }

    return <div className="shrink-0 min-w-[140px] flex-1">{card}</div>;
}
