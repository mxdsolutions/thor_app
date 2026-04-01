"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-context";

export default function DetailsPage() {
    const tenant = useTenant();
    const [companyName, setCompanyName] = useState(tenant.company_name || "");
    const [address, setAddress] = useState(tenant.address || "");
    const [phone, setPhone] = useState(tenant.phone || "");
    const [email, setEmail] = useState(tenant.email || "");
    const [abn, setAbn] = useState(tenant.abn || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_name: companyName,
                    address: address || null,
                    phone: phone || null,
                    email: email || null,
                    abn: abn || null,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Company details updated.");
        } catch {
            toast.error("Failed to save details");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Company Name */}
            <div>
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                    placeholder="Your company name"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                    Displayed in the browser tab and throughout the app
                </p>
            </div>

            {/* Business Details */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background resize-none"
                        placeholder="123 Main St, City, State 1234"
                        rows={2}
                    />
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                            placeholder="(02) 1234 5678"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                            placeholder="info@yourcompany.com"
                        />
                    </div>
                </div>
            </div>

            {/* ABN */}
            <div>
                <label className="block text-sm font-medium mb-2">ABN</label>
                <input
                    type="text"
                    value={abn}
                    onChange={(e) => setAbn(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                    placeholder="12 345 678 901"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                    Australian Business Number — displayed on quotes and invoices
                </p>
            </div>

            {/* Save */}
            <div className="pt-4 border-t border-border">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
