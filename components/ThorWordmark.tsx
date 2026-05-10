import { cn } from "@/lib/utils";

type ThorWordmarkProps = {
    /** Pixel size of the THOR letters. The TM superscript scales relative to it. */
    size?: number;
    /** Surface variant — `dark` is white text (for slate/black backgrounds),
     *  `light` is foreground text (for paper/white backgrounds). */
    surface?: "dark" | "light";
    className?: string;
};

/**
 * Full THOR™ brand wordmark. Paladins-Condensed for the letterforms,
 * Inter-superscript ™. Used wherever we want the typographic mark instead
 * of the bitmap /logo.png — onboarding, the auth shell, the dashboard
 * mobile drawer.
 */
export function ThorWordmark({
    size = 44,
    surface = "dark",
    className,
}: ThorWordmarkProps) {
    const tmFontSize = `${size * 0.45}px`;
    const tmMarginLeft = `${size * 0.18}px`;
    const tmMarginTop = `${size * 0.15}px`;

    return (
        <span
            style={{ fontSize: size, lineHeight: 1 }}
            className={cn(
                "font-paladins tracking-[0.08em] inline-flex items-start",
                surface === "dark" ? "text-white" : "text-foreground",
                className,
            )}
        >
            THOR
            <span
                style={{
                    fontSize: tmFontSize,
                    marginLeft: tmMarginLeft,
                    marginTop: tmMarginTop,
                }}
                className={cn(
                    "font-sans font-semibold align-super",
                    surface === "dark" ? "text-white/60" : "text-foreground/60",
                )}
            >
                ™
            </span>
        </span>
    );
}
