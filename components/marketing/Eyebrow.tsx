import { cn } from "@/lib/utils";

interface EyebrowProps {
    children: React.ReactNode;
    surface?: "dark" | "light";
    className?: string;
}

/**
 * Small uppercase tracked label. Sits above section headings as a quiet
 * orientation cue. Kept understated by design: thin rule, low-contrast text,
 * generous letter-spacing.
 */
export function Eyebrow({ children, surface = "dark", className }: EyebrowProps) {
    const isDark = surface === "dark";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em]",
                isDark ? "text-white/40" : "text-foreground/45",
                className,
            )}
        >
            <span className={cn("w-6 h-px", isDark ? "bg-white/25" : "bg-foreground/25")} />
            {children}
        </span>
    );
}
