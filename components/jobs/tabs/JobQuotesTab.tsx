"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Plus as PlusIcon } from "lucide-react";
import { QuoteSideSheet, type Quote } from "@/components/sheets/QuoteSideSheet";

interface Props {
    jobId: string;
    quotes: Quote[];
    onOpenCreate: () => void;
}

export function JobQuotesTab({ jobId, quotes, onOpenCreate }: Props) {
    const [selected, setSelected] = useState<Quote | null>(null);

    return (
        <div className="space-y-2 px-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-semibold text-foreground">Quotes</p>
                <Button size="sm" onClick={onOpenCreate}>
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    New Quote
                </Button>
            </div>
            {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No quotes yet</p>
            ) : quotes.map((q) => (
                <div key={q.id} onClick={() => setSelected(q)} className="flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                    <div>
                        <p className="font-medium">{q.title || "Untitled Quote"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{q.status}</p>
                    </div>
                    <span className="font-semibold">${(q.total_amount || 0).toFixed(2)}</span>
                </div>
            ))}
            <QuoteSideSheet
                quote={selected}
                open={!!selected}
                onOpenChange={(open) => { if (!open) setSelected(null); }}
                onUpdate={() => mutate(`/api/quotes?job_id=${jobId}`)}
            />
        </div>
    );
}
