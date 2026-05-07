"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnalyticsPeriod } from "@/lib/swr";

interface PeriodSelectorProps {
    value: AnalyticsPeriod;
    onChange: (next: AnalyticsPeriod) => void;
}

const OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "qtd", label: "This quarter" },
    { value: "ytd", label: "This year" },
    { value: "all", label: "All time" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as AnalyticsPeriod)}>
            <SelectTrigger className="w-[160px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
