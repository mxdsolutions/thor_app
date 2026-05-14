import { cn } from "@/lib/utils";

interface SlateHeroProps {
    children: React.ReactNode;
    className?: string;
    /** Add the soft ambient glow in the corner. Defaults to true. */
    glow?: boolean;
    /** Vertical padding preset. Hero pages use `tall`; section pages use `compact`. */
    size?: "tall" | "compact";
    /** Show industrial registration marks at the inner corners. Defaults to true. */
    marks?: boolean;
}

/**
 * Full-bleed pure-black hero — premium marketing surface.
 * Sits beneath the fixed marketing nav (top padding accounts for nav height).
 *
 * Industrial details: a single soft glow, optional `+` registration marks at
 * the inner corners (like a printer's mark or surveyor's bench mark), and a
 * hairline foot dividing the hero from the page body below.
 *
 * Note: marketing surfaces are pure black. The dashboard product still uses
 * `bg-foreground` (slate). Product mockups inside marketing keep slate so
 * they accurately depict the app.
 */
export function SlateHero({ children, className, glow = true, size = "tall", marks = true }: SlateHeroProps) {
    return (
        <section
            className={cn(
                "relative overflow-hidden bg-black text-white",
                size === "tall" ? "pt-40 pb-32 lg:pt-48 lg:pb-36" : "pt-36 pb-20 lg:pt-40 lg:pb-24",
            )}
        >
            {/* Single soft ambient — orange wash, top-right. Restrained. */}
            {glow && (
                <div
                    aria-hidden
                    className="absolute -top-48 -right-48 w-[760px] h-[760px] rounded-full opacity-60 blur-[120px]"
                    style={{
                        background:
                            "radial-gradient(closest-side, hsla(16,87%,55%,0.18), hsla(16,87%,55%,0) 72%)",
                    }}
                />
            )}

            <div className={cn("relative mx-auto max-w-7xl px-6 lg:px-10", className)}>
                {/* Registration marks — printer's marks / surveyor's bench marks
                    pinned to the inner corners of the content area. Pure decoration,
                    but the kind of detail that says "this is for the trades". */}
                {marks && (
                    <>
                        <RegMark className="absolute top-0 left-6 lg:left-10 -translate-y-1/2" />
                        <RegMark className="absolute top-0 right-6 lg:right-10 -translate-y-1/2" />
                        <RegMark className="absolute bottom-0 left-6 lg:left-10 translate-y-1/2" />
                        <RegMark className="absolute bottom-0 right-6 lg:right-10 translate-y-1/2" />
                    </>
                )}

                {children}
            </div>

            {/* Hairline foot — fades to nothing at the edges */}
            <div aria-hidden className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </section>
    );
}

/** Industrial `+` registration mark — thin cross, low contrast. */
function RegMark({ className }: { className?: string }) {
    return (
        <span
            aria-hidden
            className={cn("block w-3 h-3 text-white/25", className)}
        >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                <line x1="6" y1="0" x2="6" y2="12" />
                <line x1="0" y1="6" x2="12" y2="6" />
            </svg>
        </span>
    );
}
