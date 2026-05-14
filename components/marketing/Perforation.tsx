import { cn } from "@/lib/utils";

interface PerforationProps {
    /** "light" sits on background; "dark" sits on a dark surface. */
    surface?: "light" | "dark";
    /** Padding above and below the perforation row. */
    spacing?: "tight" | "loose";
    className?: string;
}

/**
 * Horizontal row of evenly-spaced dots — a perforated tear line.
 * Replaces the hairline `border-y` between sections with a more tactile,
 * docket-feel divider. Pairs with the JobTicket / work-order aesthetic.
 *
 * Implemented as a CSS radial-gradient repeated horizontally — no SVG ids,
 * so multiple instances on the same page don't collide.
 */
export function Perforation({ surface = "light", spacing = "tight", className }: PerforationProps) {
    const dotColor = surface === "dark" ? "rgba(255,255,255,0.18)" : "rgba(34,40,49,0.22)";
    return (
        <div
            aria-hidden
            className={cn(
                "w-full",
                spacing === "loose" ? "py-8" : "py-3",
                className,
            )}
        >
            <div
                className="h-[3px] w-full"
                style={{
                    backgroundImage: `radial-gradient(circle, ${dotColor} 1.25px, transparent 1.5px)`,
                    backgroundSize: "14px 100%",
                    backgroundRepeat: "repeat-x",
                    backgroundPosition: "center",
                }}
            />
        </div>
    );
}
