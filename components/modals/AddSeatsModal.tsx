"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface AddSeatsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Current paid seat count (Stripe quantity). */
    currentQuantity: number;
    /** Per-seat price in cents for the active billing cycle. */
    perSeatCents: number;
    /** "month" or "year" for the price label. */
    cycleLabel: "month" | "year";
    onAdded?: () => void;
}

export function AddSeatsModal({
    open,
    onOpenChange,
    currentQuantity,
    perSeatCents,
    cycleLabel,
    onAdded,
}: AddSeatsModalProps) {
    const [delta, setDelta] = useState(1);
    const [saving, setSaving] = useState(false);

    const newQuantity = currentQuantity + delta;
    const additionalCents = perSeatCents * delta;

    const handleConfirm = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/stripe/seats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ delta }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(body?.error ?? "Couldn't add seats");
                return;
            }
            toast.success(
                delta === 1
                    ? "1 seat added. The change will appear shortly."
                    : `${delta} seats added. The change will appear shortly.`,
            );
            onAdded?.();
            onOpenChange(false);
            setDelta(1);
        } catch {
            toast.error("Couldn't add seats");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add seats</DialogTitle>
                    <DialogDescription>
                        New seats are available immediately. You&apos;ll be charged a prorated
                        amount on your next invoice for the time remaining in this billing period.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5 pb-2">
                    <div className="rounded-xl border border-border p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Seats to add
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-lg h-9 w-9"
                                onClick={() => setDelta((v) => Math.max(1, v - 1))}
                                disabled={delta <= 1 || saving}
                                aria-label="Decrease seats to add"
                            >
                                <IconMinus className="w-4 h-4" />
                            </Button>
                            <div className="text-2xl font-display font-semibold tabular-nums w-12 text-center">
                                {delta}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-lg h-9 w-9"
                                onClick={() => setDelta((v) => v + 1)}
                                disabled={saving}
                                aria-label="Increase seats to add"
                            >
                                <IconPlus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <Row label="Current paid seats" value={String(currentQuantity)} />
                        <Row label="After change" value={String(newQuantity)} bold />
                        <div className="border-t border-border pt-2 mt-2">
                            <Row
                                label={`Added to next invoice / ${cycleLabel}`}
                                value={`+ ${formatCurrency(additionalCents / 100)}`}
                                bold
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Prorated for the remainder of the current period.
                            </p>
                        </div>
                    </div>
                </DialogBody>
                <DialogFooter className="px-6 sm:px-8 py-4 border-t border-border">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={saving}>
                        {saving ? "Adding..." : `Add ${delta} seat${delta === 1 ? "" : "s"}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className={bold ? "font-semibold" : ""}>{value}</span>
        </div>
    );
}
