"use client";

import { useTenant } from "@/lib/tenant-context";

export function QuoteHeader() {
    const tenant = useTenant();
    const hasDetails = tenant.address || tenant.phone || tenant.email || tenant.abn;

    return (
        <div className="flex items-start justify-between gap-6 pb-5 border-b border-border">
            {/* Left: Logo + Company Name */}
            <div className="flex items-center gap-4 min-w-0">
                {tenant.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */
                    <img
                        src={tenant.logo_url}
                        alt={tenant.company_name || "Company logo"}
                        className="h-12 w-auto max-w-[120px] object-contain shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-foreground font-statement uppercase">
                            {(tenant.company_name || tenant.name || "?")[0].toUpperCase()}
                        </span>
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                        {tenant.company_name || tenant.name}
                    </h3>
                    {tenant.abn && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            ABN {tenant.abn}
                        </p>
                    )}
                </div>
            </div>

            {/* Right: Contact details */}
            {hasDetails && (
                <div className="text-right text-[11px] text-muted-foreground leading-relaxed shrink-0">
                    {tenant.address && (
                        <p className="whitespace-pre-line">{tenant.address}</p>
                    )}
                    {tenant.phone && <p>{tenant.phone}</p>}
                    {tenant.email && <p>{tenant.email}</p>}
                </div>
            )}
        </div>
    );
}
