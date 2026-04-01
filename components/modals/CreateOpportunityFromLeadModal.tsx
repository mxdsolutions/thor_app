"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineItemsTable } from "@/features/line-items/LineItemsTable";
import { toast } from "sonner";

type DraftLineItem = {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
};

interface CreateOpportunityFromLeadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
    companyId: string | null;
    companyName: string | null;
    onCreated?: (opportunity: any) => void;
}

export function CreateOpportunityFromLeadModal({
    open,
    onOpenChange,
    leadId,
    companyId,
    companyName,
    onCreated,
}: CreateOpportunityFromLeadModalProps) {
    const router = useRouter();
    const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
    const [probability, setProbability] = useState("50");
    const [expectedCloseDate, setExpectedCloseDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [services, setServices] = useState<{ id: string; name: string; initial_value: number | null }[]>([]);

    useEffect(() => {
        if (!open) return;
        setLineItems([]);
        setProbability("50");
        setExpectedCloseDate("");

        fetch("/api/services")
            .then((r) => r.json())
            .then((d) => setServices((d.services || []).filter((p: any) => p.status === "active")))
            .catch(() => {});
    }, [open]);

    const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

    const generatedTitle = useMemo(() => {
        const company = companyName || "Unknown";
        const productPart =
            lineItems.length === 0
                ? ""
                : lineItems.length === 1
                  ? lineItems[0].product_name
                  : "Multi-product";
        const valuePart = `$${total.toLocaleString()}`;
        if (lineItems.length === 0) return `${company} - ${valuePart}`;
        return `${company} - ${productPart} - ${valuePart}`;
    }, [companyName, lineItems, total]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lineItems.length === 0) return;

        setSaving(true);
        try {
            const res = await fetch("/api/opportunities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: generatedTitle,
                    value: total,
                    probability: probability ? parseInt(probability) : 0,
                    expected_close_date: expectedCloseDate || null,
                    lead_id: leadId,
                    company_id: companyId,
                    stage: "appt_booked",
                }),
            });
            if (!res.ok) throw new Error("Failed to create opportunity");
            const data = await res.json();
            const oppId = data.opportunity?.id;

            if (oppId) {
                await Promise.all([
                    ...lineItems.map((li) =>
                        fetch("/api/opportunity-line-items", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                opportunity_id: oppId,
                                product_id: li.product_id,
                                quantity: li.quantity,
                                unit_price: li.unit_price,
                            }),
                        })
                    ),
                    fetch("/api/leads", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: leadId, opportunity_id: oppId }),
                    }),
                ]);
            }

            toast.success("Opportunity created");
            onCreated?.(data.opportunity);
            onOpenChange(false);
            router.push(`/dashboard/crm/opportunities?open=${oppId}`);
        } catch {
            toast.error("Failed to create opportunity");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create Opportunity</DialogTitle>
                    <DialogDescription>
                        Add services to create an opportunity from this lead.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2 min-h-0">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Company</label>
                            <Input value={companyName || "—"} disabled className="rounded-xl bg-muted" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Opportunity Name</label>
                            <Input value={generatedTitle} disabled className="rounded-xl bg-muted text-xs" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Probability %</label>
                            <Input
                                placeholder="50"
                                value={probability}
                                onChange={(e) => setProbability(e.target.value.replace(/[^0-9]/g, ""))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Expected Close Date</label>
                            <Input
                                type="date"
                                value={expectedCloseDate}
                                onChange={(e) => setExpectedCloseDate(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 min-h-0 flex flex-col">
                        <label className="text-xs font-medium text-muted-foreground">
                            Services {lineItems.length > 0 && `(${lineItems.length})`}
                        </label>
                        <LineItemsTable
                            mode="draft"
                            items={lineItems}
                            services={services}
                            onItemsChange={setLineItems}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={lineItems.length === 0 || saving}>
                            {saving ? "Creating..." : "Create Opportunity"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
