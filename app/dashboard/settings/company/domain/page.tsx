"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { IconCircleCheck as CheckCircleIcon, IconClock as ClockIcon } from "@tabler/icons-react";

export default function DomainPage() {
    const [domain, setDomain] = useState("");
    const [currentDomain, setCurrentDomain] = useState<string | null>(null);
    const [verified, setVerified] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenant();
    }, []);

    const fetchTenant = async () => {
        try {
            const res = await fetch("/api/tenant");
            if (res.ok) {
                const { tenant: t } = await res.json();
                setCurrentDomain(t.custom_domain);
                setVerified(t.domain_verified);
                if (t.custom_domain) setDomain(t.custom_domain);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!domain.trim()) {
            toast.error("Please enter a domain");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ custom_domain: domain.trim().toLowerCase() }),
            });
            if (!res.ok) throw new Error();
            setCurrentDomain(domain.trim().toLowerCase());
            setVerified(false);
            toast.success("Domain saved. Follow the DNS instructions below to verify.");
        } catch {
            toast.error("Failed to save domain");
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ custom_domain: null }),
            });
            if (!res.ok) throw new Error();
            setCurrentDomain(null);
            setDomain("");
            setVerified(false);
            toast.success("Custom domain removed");
        } catch {
            toast.error("Failed to remove domain");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-48" />
                <div className="h-32 bg-muted rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current status */}
            {currentDomain && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                    verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                }`}>
                    {verified ? (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className="text-sm font-medium">
                            {verified ? "Domain verified" : "Pending verification"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {currentDomain}
                        </p>
                    </div>
                </div>
            )}

            {/* Domain input */}
            <div>
                <label className="block text-sm font-medium mb-2">Domain</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                        placeholder="crm.yourcompany.com"
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving || !domain.trim()}
                        className="px-4 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                    >
                        {saving ? "Saving..." : currentDomain ? "Update" : "Add Domain"}
                    </button>
                </div>
            </div>

            {/* DNS Instructions */}
            {currentDomain && !verified && (
                <div className="border border-border rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-semibold">DNS Configuration</h3>
                    <p className="text-xs text-muted-foreground">
                        Add the following DNS record at your domain registrar:
                    </p>
                    <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-2">
                        <div className="flex gap-4">
                            <span className="text-muted-foreground w-16">Type:</span>
                            <span className="font-semibold">CNAME</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-muted-foreground w-16">Name:</span>
                            <span className="font-semibold">{currentDomain.split(".")[0]}</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-muted-foreground w-16">Value:</span>
                            <span className="font-semibold">cname.vercel-dns.com</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        DNS changes can take up to 48 hours to propagate. Verification will happen automatically once detected.
                    </p>
                </div>
            )}

            {/* Remove domain */}
            {currentDomain && (
                <div className="pt-4 border-t border-border">
                    <button
                        onClick={handleRemove}
                        disabled={saving}
                        className="text-sm text-destructive hover:underline"
                    >
                        Remove custom domain
                    </button>
                </div>
            )}
        </div>
    );
}
