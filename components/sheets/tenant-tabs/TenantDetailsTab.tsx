"use client";

import { Badge } from "@/components/ui/badge";
import { DetailFields } from "../DetailFields";
import type { Tenant, TenantSaveHandler } from "./types";

interface Props {
    data: Tenant;
    onSave: TenantSaveHandler;
}

export function TenantDetailsTab({ data, onSave }: Props) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <DetailFields
                    onSave={onSave}
                    fields={[
                        { label: "Company Name", value: data.company_name || data.name, dbColumn: "company_name", type: "text", rawValue: data.company_name || data.name },
                        { label: "Slug", value: data.slug },
                        { label: "Owner", value: data.owner?.full_name || "—" },
                        { label: "Email", value: data.email, dbColumn: "email", type: "text", rawValue: data.email },
                        { label: "Phone", value: data.phone, dbColumn: "phone", type: "text", rawValue: data.phone },
                        { label: "Address", value: data.address, dbColumn: "address", type: "text", rawValue: data.address },
                        { label: "ABN", value: data.abn, dbColumn: "abn", type: "text", rawValue: data.abn },
                        {
                            label: "Created",
                            value: new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                        },
                    ]}
                />
            </div>

            {/* Branding */}
            <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-3">
                    Branding
                </p>
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Primary Color</span>
                        <div className="flex items-center gap-2">
                            {data.primary_color ? (
                                <>
                                    <div
                                        className="w-5 h-5 rounded-full ring-1 ring-border/50"
                                        style={{ backgroundColor: data.primary_color }}
                                    />
                                    <span className="text-sm text-foreground">{data.primary_color}</span>
                                </>
                            ) : (
                                <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Logo</span>
                        {data.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */
                            <img src={data.logo_url} alt="Logo" className="h-8 object-contain" />
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Logo (Dark)</span>
                        {data.logo_dark_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */
                            <img src={data.logo_dark_url} alt="Logo Dark" className="h-8 object-contain bg-black rounded p-1" />
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">&mdash;</span>
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-medium text-muted-foreground shrink-0 pt-1">Custom Domain</span>
                        <span className="text-sm text-foreground text-right">
                            {data.custom_domain ? (
                                <span className="flex items-center gap-2">
                                    {data.custom_domain}
                                    <Badge variant={data.domain_verified ? "default" : "secondary"} className="text-[10px]">
                                        {data.domain_verified ? "Verified" : "Pending"}
                                    </Badge>
                                </span>
                            ) : (
                                <span className="text-muted-foreground/40">&mdash;</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border bg-card p-5">
                <DetailFields
                    onSave={onSave}
                    fields={[
                        { label: "Internal Notes", value: data.notes, dbColumn: "notes", type: "textarea", rawValue: data.notes },
                    ]}
                />
            </div>
        </div>
    );
}
