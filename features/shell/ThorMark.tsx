import { cn } from "@/lib/utils";

type ThorMarkProps = {
    /** Pixel size of the "T". The "AI" suffix scales relative to it. */
    size?: number;
    /** Whether to show the small "AI" superscript next to the T. */
    withAI?: boolean;
    /** Which surface the mark is sitting on. Picks the gradient stops. */
    surface?: "dark" | "light";
    className?: string;
};

/**
 * The brand "gradient T" mark — used in the sidebar header, the assistant
 * trigger in the desktop header, and the mobile assistant FAB. Renders a
 * Paladins-Condensed "T" with a vertical zinc gradient, optionally followed
 * by a tiny "AI" superscript. Gradient stops adapt to the surface so the
 * mark can sit directly on light backgrounds without needing a dark tile.
 */
export function ThorMark({
    size = 24,
    withAI = false,
    surface = "dark",
    className,
}: ThorMarkProps) {
    const aiSize = Math.max(7, Math.round(size * 0.3));

    const tGradient =
        surface === "dark"
            ? "from-zinc-100 via-zinc-300 to-zinc-500"
            : "from-foreground via-zinc-700 to-zinc-500";

    const aiGradient =
        surface === "dark"
            ? "from-zinc-100 to-zinc-400"
            : "from-foreground to-zinc-500";

    return (
        <span
            className={cn(
                "relative inline-flex items-start leading-none",
                className,
            )}
        >
            <span
                className={cn(
                    "font-paladins leading-none bg-clip-text text-transparent bg-gradient-to-b",
                    tGradient,
                )}
                style={{ fontSize: `${size}px` }}
            >
                T
            </span>
            {withAI && (
                <span
                    className={cn(
                        "font-sans font-bold leading-none ml-[1px] mt-[1px] tracking-tight bg-clip-text text-transparent bg-gradient-to-b",
                        aiGradient,
                    )}
                    style={{ fontSize: `${aiSize}px` }}
                >
                    AI
                </span>
            )}
        </span>
    );
}
