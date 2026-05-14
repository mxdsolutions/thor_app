import { cn } from "@/lib/utils";

interface BrandStampProps {
    /** Serial number, e.g. "0042" or "0007" */
    serial: string;
    /** Volume / issue marker, e.g. "VOL.I — 2026" */
    edition?: string;
    /** Final line, e.g. "VERIFIED · MELB" */
    seal?: string;
    surface?: "dark" | "light";
    className?: string;
}

/**
 * Serialized brand stamp — the recurring "this is a working document"
 * mark that anchors every hero top-right and reappears in the footer
 * and on artifacts. Like the publishing info on a magazine masthead
 * or the serial plate on a manufactured product.
 *
 * On mobile, only the top "THOR · № NNNN" line shows. The edition and
 * seal lines appear from `sm:` breakpoint up — keeps the mobile masthead
 * minimal while letting the full mark land on desktop.
 */
export function BrandStamp({
    serial,
    edition = "VOL.I — 2026",
    seal = "Verified · MELB",
    surface = "dark",
    className,
}: BrandStampProps) {
    const isDark = surface === "dark";
    return (
        <div
            className={cn(
                "inline-flex flex-col items-end gap-1.5 select-none",
                isDark ? "text-white/55" : "text-foreground/55",
                className,
            )}
        >
            <div className="flex items-baseline gap-2.5">
                <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.32em]",
                    isDark ? "text-white/45" : "text-foreground/45",
                )}>
                    THOR
                </span>
                <span className={cn(
                    "block w-px h-3",
                    isDark ? "bg-white/25" : "bg-foreground/25",
                )} aria-hidden />
                <span className="font-mono text-[11px] tabular-nums">
                    № {serial}
                </span>
            </div>
            <div className={cn(
                "hidden sm:block text-[10px] font-semibold uppercase tracking-[0.28em]",
                isDark ? "text-white/35" : "text-foreground/35",
            )}>
                {edition}
            </div>
            <div className={cn(
                "hidden sm:block font-statement italic text-[12px] tracking-tight",
                isDark ? "text-white/45" : "text-foreground/45",
            )}>
                {seal}
            </div>
        </div>
    );
}
