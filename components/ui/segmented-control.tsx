"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
    value: T;
    label: string;
};

interface SegmentedControlProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: SegmentedOption<T>[];
    size?: "sm" | "md";
    className?: string;
}

/**
 * Industrial tab switcher — tight 2px interior radius inside a 4px container.
 * Shared replacement for hand-rolled toggle buttons across dashboard pages.
 */
export function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
    size = "sm",
    className,
}: SegmentedControlProps<T>) {
    const buttonSize =
        size === "md"
            ? "px-4 py-2 text-sm"
            : "px-4 py-1.5 text-xs";

    return (
        <div
            role="tablist"
            className={cn(
                "inline-flex gap-1 p-1 rounded-lg bg-secondary",
                className
            )}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "font-semibold uppercase tracking-wide rounded-sm transition-all",
                            buttonSize,
                            isActive
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
