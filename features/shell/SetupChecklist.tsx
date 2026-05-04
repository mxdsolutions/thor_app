"use client";

import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
    IconCheck,
    IconArrowRight,
    IconRotateClockwise2,
} from "@tabler/icons-react";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { useSetupChecklist, type SetupChecklistResponse } from "@/lib/swr";
import { cn } from "@/lib/utils";

const CHECKLIST_URL = "/api/tenant/setup-checklist";

export function SetupChecklist() {
    const { data, isLoading } = useSetupChecklist();
    const { mutate } = useSWRConfig();
    const [open, setOpen] = useState(false);
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    if (isLoading || !data) return null;

    const { items, progress } = data;
    const allDone = progress.complete === progress.total;
    if (allDone) return null;

    async function setSkip(key: string, skip: boolean) {
        setPendingKey(key);
        try {
            const res = await fetch(
                skip
                    ? `${CHECKLIST_URL}/skip`
                    : `${CHECKLIST_URL}/skip?key=${encodeURIComponent(key)}`,
                {
                    method: skip ? "POST" : "DELETE",
                    headers: skip ? { "Content-Type": "application/json" } : undefined,
                    body: skip ? JSON.stringify({ key }) : undefined,
                }
            );
            if (!res.ok) throw new Error("Failed");
            await mutate(CHECKLIST_URL);
        } catch {
            toast.error(skip ? "Couldn't skip item" : "Couldn't restore item");
        } finally {
            setPendingKey(null);
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    title={`Setup ${progress.done} of ${progress.total} complete`}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
                >
                    <ProgressRing
                        done={progress.done}
                        total={progress.total}
                        complete={progress.complete}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[380px] p-0"
            >
                <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold font-display">
                            Get set up
                        </h3>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {progress.done} of {progress.total}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        A few quick steps to get THOR working for your business.
                    </p>
                    <ProgressBar
                        done={progress.done}
                        total={progress.total}
                        complete={progress.complete}
                    />
                </div>
                <ul className="max-h-[60vh] overflow-y-auto py-1">
                    {items.map((item) => (
                        <ChecklistRow
                            key={item.key}
                            item={item}
                            disabled={pendingKey === item.key}
                            onSkip={() => setSkip(item.key, true)}
                            onUnskip={() => setSkip(item.key, false)}
                            onNavigate={() => setOpen(false)}
                        />
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}

function ChecklistRow({
    item,
    disabled,
    onSkip,
    onUnskip,
    onNavigate,
}: {
    item: SetupChecklistResponse["items"][number];
    disabled: boolean;
    onSkip: () => void;
    onUnskip: () => void;
    onNavigate: () => void;
}) {
    const isComplete = item.status === "complete";
    const isSkipped = item.status === "skipped";

    return (
        <li className="px-2">
            <div
                className={cn(
                    "group flex items-start gap-3 px-3 py-3 rounded-lg",
                    !isComplete && "hover:bg-secondary/60"
                )}
            >
                <StatusDot status={item.status} />
                <div className="flex-1 min-w-0">
                    <div
                        className={cn(
                            "text-sm font-medium",
                            isComplete && "text-muted-foreground line-through",
                            isSkipped && "text-muted-foreground"
                        )}
                    >
                        {item.label}
                    </div>
                    {!isComplete && (
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {item.description}
                        </div>
                    )}
                    {!isComplete && (
                        <div className="flex items-center gap-3 mt-2">
                            <Link
                                href={item.href}
                                onClick={onNavigate}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                {isSkipped ? "Do it now" : "Set up"}
                                <IconArrowRight className="w-3 h-3" />
                            </Link>
                            {isSkipped ? (
                                <button
                                    onClick={onUnskip}
                                    disabled={disabled}
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                                >
                                    <IconRotateClockwise2 className="w-3 h-3" />
                                    Restore
                                </button>
                            ) : (
                                <button
                                    onClick={onSkip}
                                    disabled={disabled}
                                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                                >
                                    Skip
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

function StatusDot({ status }: { status: "complete" | "skipped" | "pending" }) {
    if (status === "complete") {
        return (
            <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <IconCheck className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
        );
    }
    if (status === "skipped") {
        return (
            <span className="mt-0.5 w-5 h-5 rounded-full border border-dashed border-muted-foreground/40 shrink-0" />
        );
    }
    return (
        <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
    );
}

function ProgressRing({
    done,
    total,
    complete,
}: {
    done: number;
    total: number;
    complete: number;
}) {
    const size = 26;
    const stroke = 2.5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const completeRatio = total > 0 ? complete / total : 0;
    const skippedRatio = total > 0 ? (done - complete) / total : 0;
    const completeLen = circumference * completeRatio;
    const skippedLen = circumference * skippedRatio;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="none"
                    className="opacity-20"
                />
                {skippedLen > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={stroke}
                        fill="none"
                        strokeDasharray={`${skippedLen} ${circumference}`}
                        strokeDashoffset={-completeLen}
                        className="opacity-40"
                    />
                )}
                {completeLen > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={stroke}
                        fill="none"
                        strokeDasharray={`${completeLen} ${circumference}`}
                        strokeLinecap="round"
                        className="text-emerald-500"
                    />
                )}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums">
                {complete}/{total}
            </span>
        </div>
    );
}

function ProgressBar({
    done,
    total,
    complete,
}: {
    done: number;
    total: number;
    complete: number;
}) {
    const completePct = total > 0 ? (complete / total) * 100 : 0;
    const skippedPct = total > 0 ? ((done - complete) / total) * 100 : 0;
    return (
        <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden flex">
            <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${completePct}%` }}
            />
            <div
                className="bg-muted-foreground/30 transition-all"
                style={{ width: `${skippedPct}%` }}
            />
        </div>
    );
}
