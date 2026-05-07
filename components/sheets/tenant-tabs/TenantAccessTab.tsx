"use client";

import { Button } from "@/components/ui/button";
import { DetailFields } from "../DetailFields";
import type { Tenant, TenantSaveHandler } from "./types";

interface Props {
    data: Tenant;
    onSave: TenantSaveHandler;
    onSuspendToggle: () => void;
    suspending: boolean;
}

export function TenantAccessTab({ data, onSave, onSuspendToggle, suspending }: Props) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <DetailFields
                    onSave={onSave}
                    fields={[
                        {
                            label: "Status",
                            value: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : null,
                            dbColumn: "status",
                            type: "select",
                            rawValue: data.status,
                            options: [
                                { value: "active", label: "Active" },
                                { value: "suspended", label: "Suspended" },
                            ],
                        },
                        { label: "Custom Domain", value: data.custom_domain || "Not configured" },
                        { label: "Domain Verified", value: data.domain_verified ? "Yes" : "No" },
                    ]}
                />
            </div>
            <div className="pt-2">
                <Button
                    variant={data.status === "suspended" ? "default" : "destructive"}
                    onClick={onSuspendToggle}
                    disabled={suspending}
                >
                    {data.status === "suspended" ? "Reactivate Tenant" : "Suspend Tenant"}
                </Button>
            </div>
        </div>
    );
}
