"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useMyTenants, type MyTenant } from "@/lib/swr";
import { switchTenant } from "@/app/actions/tenant";
import { cn } from "@/lib/utils";

type ActiveTenant = {
    id: string;
    name: string;
    company_name: string | null;
    logo_url: string | null;
};

export function TenantSwitcher({ active }: { active: ActiveTenant }) {
    const [open, setOpen] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const { data } = useMyTenants();
    const tenants = data?.tenants ?? [];

    const activeDisplayName = active.company_name || active.name;
    const busy = isPending || pendingId !== null;

    const handleSwitch = (tenant: MyTenant) => {
        if (tenant.id === active.id || busy) {
            setOpen(false);
            return;
        }
        setPendingId(tenant.id);
        startTransition(async () => {
            const result = await switchTenant(tenant.id);
            setPendingId(null);
            if (!result.success) {
                toast.error(result.error || "Failed to switch workspace");
                return;
            }
            toast.success(`Switched to ${tenant.company_name || tenant.name}`);
            setOpen(false);
            // Full reload: clears SWR cache + forces middleware to read the
            // refreshed JWT cookies and re-resolve tenant context.
            window.location.reload();
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-3 min-w-0 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.07] transition-colors text-left w-full"
                    aria-label="Switch workspace"
                >
                    <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                        {active.logo_url ? (
                            <Image src={active.logo_url} alt="" width={36} height={36} className="w-full h-full object-cover" unoptimized />
                        ) : (
                            <span className="text-sm font-bold text-white/70 uppercase">
                                {activeDisplayName.slice(0, 1)}
                            </span>
                        )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-white/80 truncate">{activeDisplayName}</span>
                    <ChevronsUpDown className="shrink-0 w-4 h-4 text-white/40" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[240px] bg-black border-white/10 text-white p-1"
            >
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Workspaces
                </div>
                <div className="max-h-[280px] overflow-y-auto py-1">
                    {tenants.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-white/40">
                            {data === undefined ? "Loading…" : "No workspaces available"}
                        </div>
                    ) : (
                        tenants.map((tenant) => {
                            const isActive = tenant.id === active.id;
                            const displayName = tenant.company_name || tenant.name;
                            const isSwitching = pendingId === tenant.id;
                            return (
                                <button
                                    key={tenant.id}
                                    type="button"
                                    onClick={() => handleSwitch(tenant)}
                                    disabled={busy}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
                                        isActive ? "bg-white/10" : "hover:bg-white/[0.07]",
                                        busy && !isSwitching && "opacity-60 cursor-not-allowed",
                                    )}
                                >
                                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                                        {tenant.logo_url ? (
                                            <Image src={tenant.logo_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                                        ) : (
                                            <span className="text-[11px] font-bold text-white/70 uppercase">
                                                {displayName.slice(0, 1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 leading-tight">
                                        <div className="text-[13px] font-medium text-white truncate">{displayName}</div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-wider truncate">{tenant.role}</div>
                                    </div>
                                    {isSwitching ? (
                                        <span className="text-[10px] text-white/40">…</span>
                                    ) : isActive ? (
                                        <Check className="shrink-0 w-4 h-4 text-white" />
                                    ) : null}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
