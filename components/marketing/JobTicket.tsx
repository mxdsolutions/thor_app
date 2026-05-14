import { cn } from "@/lib/utils";

interface JobTicketProps {
    /** Top-left label, e.g. "TESTIMONIAL" */
    kind: string;
    /** Top-right reference, e.g. "J-2041" */
    reference: string;
    /** Top-right meta line, e.g. "Issued 14 / 03 / 2026" */
    issued?: string;
    /** Top-right status, e.g. "Verified" */
    status?: string;
    children: React.ReactNode;
    /** Sign-off block at the bottom — name, role, business */
    signature?: {
        name: string;
        meta: string;
    };
    surface?: "dark" | "light";
    className?: string;
}

/**
 * Work-order styled frame — header metadata, body content, signature block.
 * Looks like a real job ticket / contractor's docket. Pairs with the trades ICP.
 *
 * Header uses tracked uppercase + mono numerics for that "stamped" feel.
 */
export function JobTicket({
    kind,
    reference,
    issued,
    status,
    children,
    signature,
    surface = "dark",
    className,
}: JobTicketProps) {
    const isDark = surface === "dark";
    return (
        <article
            className={cn(
                "rounded-xl border overflow-hidden",
                isDark ? "border-white/15 bg-white/[0.02]" : "border-foreground/15 bg-card",
                className,
            )}
        >
            {/* Header — work order metadata. Stacks on narrow viewports. */}
            <div className={cn(
                "px-5 sm:px-6 md:px-8 py-4 border-b flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:items-baseline",
                isDark ? "border-white/10" : "border-foreground/10",
            )}>
                <div className="flex items-baseline gap-3">
                    <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.28em]",
                        isDark ? "text-white/45" : "text-muted-foreground",
                    )}>
                        {kind}
                    </span>
                    <span className={cn(
                        "font-mono text-[11px] tabular-nums",
                        isDark ? "text-white/55" : "text-foreground/55",
                    )}>
                        · {reference}
                    </span>
                </div>
                <div className={cn(
                    "flex items-baseline gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] sm:justify-end sm:text-right",
                    isDark ? "text-white/40" : "text-muted-foreground",
                )}>
                    {issued && <span className="font-mono normal-case tracking-normal text-[11px]">{issued}</span>}
                    {status && (
                        <>
                            {issued && <span aria-hidden className={isDark ? "text-white/20" : "text-foreground/20"}>·</span>}
                            <span>{status}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-6 md:px-10 py-10 md:py-14">
                {children}
            </div>

            {/* Signature block */}
            {signature && (
                <div className={cn(
                    "px-5 sm:px-6 md:px-8 py-5 border-t flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2",
                    isDark ? "border-white/10 bg-white/[0.015]" : "border-foreground/10 bg-secondary/40",
                )}>
                    <div className="flex items-baseline gap-3">
                        <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-[0.28em]",
                            isDark ? "text-white/40" : "text-muted-foreground",
                        )}>
                            Signed
                        </span>
                        <span className={cn(
                            "font-statement italic text-[14px]",
                            isDark ? "text-white/85" : "text-foreground/85",
                        )}>
                            {signature.name}
                        </span>
                    </div>
                    <span className={cn(
                        "text-[12px]",
                        isDark ? "text-white/45" : "text-muted-foreground",
                    )}>
                        {signature.meta}
                    </span>
                </div>
            )}
        </article>
    );
}
