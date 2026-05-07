"use client";

import useSWR from "swr";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { DetailFields } from "../DetailFields";
import { QUOTE_STATUS_CONFIG } from "@/lib/status-config";
import type { Quote } from "../QuoteSideSheet";

const statusConfig = QUOTE_STATUS_CONFIG;

interface Props {
    data: Quote;
    open: boolean;
    onSave: (column: string, value: string | number | null) => Promise<void>;
}

export function QuoteDetailsTab({ data, open, onSave }: Props) {
    const status = statusConfig[data.status] || statusConfig.draft;

    const { data: xeroMappingData } = useSWR<{ mapping: { xero_id: string; last_synced_at: string | null; sync_direction: string | null } | null }>(
        open && data.id ? `/api/integrations/xero/mapping?entity_type=quote&mxd_id=${data.id}` : null,
        (url: string) => fetch(url).then(r => r.json())
    );
    const xeroMapping = xeroMappingData?.mapping || null;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <DetailFields
                    onSave={onSave}
                    fields={[
                        { label: "Title", value: data.title, dbColumn: "title", type: "text", rawValue: data.title },
                        {
                            label: "Status",
                            value: status.label,
                            dbColumn: "status",
                            type: "select",
                            rawValue: data.status,
                            options: Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label })),
                        },
                        {
                            label: "Amount",
                            value: formatCurrency(data.total_amount),
                            dbColumn: "total_amount",
                            type: "text",
                            rawValue: String(data.total_amount),
                        },
                        {
                            label: "Valid Until",
                            value: data.valid_until || null,
                            dbColumn: "valid_until",
                            type: "text",
                            rawValue: data.valid_until,
                        },
                        {
                            label: "Created",
                            value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                        },
                    ]}
                />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">Scope</p>
                <DetailFields
                    onSave={onSave}
                    fields={[
                        {
                            label: "",
                            value: data.scope_description || null,
                            dbColumn: "scope_description",
                            type: "textarea",
                            rawValue: data.scope_description,
                        },
                    ]}
                />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">Description</p>
                <DetailFields
                    onSave={onSave}
                    fields={[
                        {
                            label: "",
                            value: data.description || null,
                            dbColumn: "description",
                            type: "textarea",
                            rawValue: data.description,
                        },
                    ]}
                />
            </div>

            {xeroMapping && (
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/60">Xero</p>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Connected to Xero
                        </span>
                    </div>
                    <DetailFields
                        fields={[
                            {
                                label: "Xero Quote ID",
                                value: (
                                    <span className="font-mono text-xs break-all">
                                        {xeroMapping.xero_id}
                                    </span>
                                ),
                            },
                            ...(xeroMapping.last_synced_at ? [{
                                label: "Last synced",
                                value: timeAgo(xeroMapping.last_synced_at),
                            }] : []),
                        ]}
                    />
                </div>
            )}
        </div>
    );
}
