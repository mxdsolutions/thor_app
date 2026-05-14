import { cn } from "@/lib/utils";

interface SectionMarkerProps {
    /** Roman numeral or short marker like "I.", "II.", "01", "—" */
    mark: string;
    /** Optional label rendered next to the mark in caps */
    label?: string;
    surface?: "dark" | "light";
    className?: string;
}

/**
 * Editorial section marker — a quiet roman numeral or number sitting above
 * a heading. Italic Bricolage for the mark, tracked caps for the label.
 *
 * Pairs with Bricolage Grotesque's literary character.
 */
export function SectionMarker({ mark, label, surface = "light", className }: SectionMarkerProps) {
    const isDark = surface === "dark";
    return (
        <div
            className={cn(
                "inline-flex items-baseline gap-3",
                isDark ? "text-white/45" : "text-foreground/45",
                className,
            )}
        >
            <span className={cn(
                "font-statement italic font-semibold text-base leading-none",
                isDark ? "text-white/55" : "text-foreground/55",
            )}>
                {mark}
            </span>
            {label && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">
                    {label}
                </span>
            )}
        </div>
    );
}
