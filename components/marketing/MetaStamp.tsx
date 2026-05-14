import { cn } from "@/lib/utils";

interface MetaStampProps {
    /** The stamp text. Will be uppercased and tracked. */
    children: React.ReactNode;
    surface?: "dark" | "light";
    className?: string;
}

/**
 * Small "stamped" or "printed" metadata text — uppercase, mono-tracking,
 * low contrast. Use sparingly: a single tag at the bottom of a page,
 * a "REG. IN AUS — VOL. I" type detail, or a small marker beside copy.
 */
export function MetaStamp({ children, surface = "light", className }: MetaStampProps) {
    const isDark = surface === "dark";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]",
                isDark ? "text-white/40" : "text-foreground/45",
                className,
            )}
        >
            {children}
        </span>
    );
}
