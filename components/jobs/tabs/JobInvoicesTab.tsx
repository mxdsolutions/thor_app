"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import { InvoiceSideSheet, type Invoice } from "@/components/sheets/InvoiceSideSheet";

interface Props {
    jobId: string;
    invoices: Invoice[];
    onOpenCreate: () => void;
}

export function JobInvoicesTab({ jobId, invoices, onOpenCreate }: Props) {
    const [selected, setSelected] = useState<Invoice | null>(null);

    return (
        <div className="space-y-2 px-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-semibold text-foreground">Invoices</p>
                <Button size="sm" onClick={onOpenCreate}>
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    New Invoice
                </Button>
            </div>
            {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
            ) : invoices.map((inv) => (
                <div key={inv.id} onClick={() => setSelected(inv)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div>
                        <p className="font-medium">{inv.invoice_number || "Untitled Invoice"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                    </div>
                    <span className="font-semibold">${(inv.total || 0).toFixed(2)}</span>
                </div>
            ))}
            <InvoiceSideSheet
                invoice={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate(`/api/invoices?job_id=${jobId}`)}
            />
        </div>
    );
}
