"use client";

import Image from "next/image";
import { useTenantOptional } from "@/lib/tenant-context";

type Props = {
    reportTitle: string;
    senderMessage?: string | null;
    senderName?: string | null;
    saveStatus: "idle" | "saving" | "saved";
    locked: boolean;
};

export function ExternalReportHeader({ reportTitle, senderMessage, senderName, saveStatus, locked }: Props) {
    const tenant = useTenantOptional();
    const displayName = tenant?.company_name || tenant?.name || "Report";

    return (
        <header className="border-b border-border bg-background">
            <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {tenant?.logo_url ? (
                        <Image
                            src={tenant.logo_url}
                            alt={displayName}
                            width={96}
                            height={32}
                            className="h-8 w-auto object-contain"
                            unoptimized
                            priority
                        />
                    ) : (
                        <span className="text-base font-semibold tracking-tight">{displayName}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {locked ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Submitted
                        </div>
                    ) : saveStatus === "saving" ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Saving…
                        </div>
                    ) : saveStatus === "saved" ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-md">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Saved
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 pb-4">
                <h1 className="text-xl font-display font-semibold leading-tight">{reportTitle}</h1>
                {senderName && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Sent by {senderName} · {displayName}
                    </p>
                )}
                {senderMessage && (
                    <div className="mt-3 rounded-lg border-l-2 border-border bg-secondary/40 px-3 py-2 text-sm whitespace-pre-line">
                        {senderMessage}
                    </div>
                )}
            </div>
        </header>
    );
}
