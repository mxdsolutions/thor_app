import { cn } from "@/lib/utils";

export interface TradeEntry {
    name: string;
    detail: string;
    /** Optional small italic tag e.g. "AUS-licensed" */
    tag?: string;
}

interface TradeIndexProps {
    items: TradeEntry[];
    className?: string;
}

/**
 * Contractor-directory style listing. Numbered rows separated by hairlines,
 * trade name in Bricolage, value-prop muted, optional italic tag.
 *
 * Reads like a parts catalogue or trades register — purposefully editorial.
 */
export function TradeIndex({ items, className }: TradeIndexProps) {
    return (
        <ul className={cn("border-t border-foreground/15", className)}>
            {items.map((item, i) => {
                const num = String(i + 1).padStart(2, "0");
                return (
                    <li
                        key={item.name}
                        className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_minmax(180px,_1.2fr)_2fr_auto] gap-x-5 md:gap-x-6 gap-y-1.5 py-5 md:py-6 border-b border-foreground/15"
                    >
                        {/* Row number — mono, low-contrast */}
                        <span className="font-mono text-[11px] text-muted-foreground/60 self-baseline mt-2 md:mt-1.5 tabular-nums">
                            {num}
                        </span>

                        {/* Trade name (with inline tag on mobile) */}
                        <span className="font-statement text-[20px] md:text-[26px] font-semibold tracking-tight text-foreground leading-tight">
                            {item.name}
                            {item.tag && (
                                <span className="md:hidden font-statement italic font-medium text-foreground/40 text-[14px] tracking-normal ml-2">
                                    — {item.tag}
                                </span>
                            )}
                        </span>

                        {/* Detail (value prop) */}
                        <span className="text-[14px] md:text-[15px] text-muted-foreground leading-[1.55] col-start-2 md:col-start-auto md:self-baseline md:mt-1.5">
                            {item.detail}
                        </span>

                        {/* Tag (md+ only — appears as separate column) */}
                        {item.tag && (
                            <span className="hidden md:inline font-statement italic text-[12px] text-foreground/45 md:self-baseline md:mt-1.5 md:text-right">
                                — {item.tag}
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
