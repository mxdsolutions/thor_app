"use client";

import { cn } from "@/lib/utils";

interface DetailField {
    label: string;
    value: React.ReactNode;
}

interface DetailFieldsProps {
    fields: DetailField[];
    className?: string;
}

export function DetailFields({ fields, className }: DetailFieldsProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {fields.map((field, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-0.5">
                        {field.label}
                    </span>
                    <span className="text-sm text-foreground text-right min-w-0 truncate">
                        {field.value || <span className="text-muted-foreground/40">—</span>}
                    </span>
                </div>
            ))}
        </div>
    );
}

interface EntityCardProps {
    label: string;
    title: string;
    subtitle?: string | null;
    icon?: React.ReactNode;
}

export function LinkedEntityCard({ label, title, subtitle, icon }: EntityCardProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-2">
                {label}
            </p>
            <div className="flex items-center gap-2.5">
                {icon && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
