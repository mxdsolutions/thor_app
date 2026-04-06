"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-context";
import { createClient } from "@/lib/supabase/client";

function toHex(color: string): string {
    if (color.startsWith("#")) return color.slice(0, 7);
    const match = color.match(/hsl\((\d+\.?\d*)[,\s]+(\d+\.?\d*)%[,\s]+(\d+\.?\d*)%\)/);
    if (!match) return "#e05a2b";
    const h = parseFloat(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export default function BrandingPage() {
    const tenant = useTenant();
    const [primaryColor, setPrimaryColor] = useState(() => toHex(tenant.primary_color || "hsl(16 87% 55%)"));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(tenant.logo_url || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primary_color: primaryColor,
                    logo_url: logoUrl || null,
                }),
            });
            if (!res.ok) throw new Error();
            // Apply brand color immediately
            document.documentElement.style.setProperty("--color-primary", primaryColor);
            document.documentElement.style.setProperty("--color-ring", primaryColor);
            toast.success("Branding updated");
        } catch {
            toast.error("Failed to save branding");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Logo must be under 5MB");
            return;
        }

        setUploading(true);
        try {
            const supabase = createClient();
            const ext = file.name.split(".").pop();
            const path = `${tenant.id}/logo.${ext}`;

            const { error } = await supabase.storage
                .from("tenant-assets")
                .upload(path, file, { upsert: true });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from("tenant-assets")
                .getPublicUrl(path);

            setLogoUrl(urlData.publicUrl);
            toast.success("Logo uploaded");
        } catch {
            toast.error("Failed to upload logo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Logo */}
            <div>
                <label className="block text-sm font-medium mb-2">Logo</label>
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <div className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                            <span className="text-xs text-muted-foreground">No logo</span>
                        </div>
                    )}
                    <div className="space-y-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            {uploading ? "Uploading..." : "Upload Logo"}
                        </button>
                        {logoUrl && (
                            <button
                                onClick={() => setLogoUrl("")}
                                className="block text-xs text-destructive hover:underline"
                            >
                                Remove logo
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, SVG or WebP. Max 5MB. Recommended: 200x80px
                </p>
            </div>

            {/* Primary Color */}
            <div>
                <label className="block text-sm font-medium mb-2">Primary Colour</label>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                    />
                    <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => {
                            const v = e.target.value;
                            setPrimaryColor(v);
                        }}
                        className="w-32 px-3 py-2 border border-border rounded-xl text-sm bg-background font-mono"
                        placeholder="#e05a2b"
                        maxLength={7}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                    Used for buttons, links, and focus states throughout the app
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
