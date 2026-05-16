"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

/**
 * Branding — house-style assets used across the app and on PDF reports.
 *  - Logo (image): rendered in the sidebar, on letterheads, on cover pages
 *  - Primary colour: buttons / links / focus rings throughout the app
 *  - Default report cover (PDF): prepended to every report that doesn't
 *    override it via its template's own report_cover_url. Used to live at
 *    Settings → Reports → Default Cover; consolidated here because it's
 *    the same kind of brand asset.
 *
 * All three are tenant-level and persist via PATCH /api/tenant. Storage
 * lives under `tenant-assets/{tenant.id}/...`.
 */
export default function BrandingPage() {
    const tenant = useTenant();
    const router = useRouter();
    const [primaryColor, setPrimaryColor] = useState(() => toHex(tenant.primary_color || "hsl(16 87% 55%)"));
    const [logoUrl, setLogoUrl] = useState(tenant.logo_url || "");
    const [reportCoverUrl, setReportCoverUrl] = useState(tenant.report_cover_url || "");
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primary_color: primaryColor,
                    logo_url: logoUrl || null,
                    report_cover_url: reportCoverUrl || null,
                }),
            });
            if (!res.ok) throw new Error();
            // Apply brand colour immediately
            document.documentElement.style.setProperty("--color-primary", primaryColor);
            document.documentElement.style.setProperty("--color-ring", primaryColor);
            toast.success("Branding updated");
            // Re-render the server layout so the TenantProvider gets the new
            // report_cover_url — otherwise the PDF generator still sees stale data.
            router.refresh();
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

        setUploadingLogo(true);
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
            setUploadingLogo(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Report cover must be under 10MB");
            return;
        }
        if (file.type !== "application/pdf") {
            toast.error("Only PDF files are supported for report covers");
            return;
        }

        setUploadingCover(true);
        try {
            const supabase = createClient();
            const path = `${tenant.id}/report-cover.pdf`;

            const { error } = await supabase.storage
                .from("tenant-assets")
                .upload(path, file, { upsert: true, contentType: "application/pdf" });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from("tenant-assets")
                .getPublicUrl(path);

            // Bust CDN cache so a re-uploaded cover shows immediately.
            setReportCoverUrl(`${urlData.publicUrl}?v=${Date.now()}`);
            toast.success("Report cover uploaded");
        } catch (err) {
            console.error("Report cover upload failed", err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            toast.error(`Failed to upload report cover: ${msg}`);
        } finally {
            setUploadingCover(false);
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
                            {/* eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded logo, dimensions unknown */}
                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                            <span className="text-xs text-muted-foreground">No logo</span>
                        </div>
                    )}
                    <div className="space-y-2">
                        <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            {uploadingLogo ? "Uploading..." : "Upload Logo"}
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
                        ref={logoInputRef}
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
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-32 px-3 py-2 border border-border rounded-xl text-sm bg-background font-mono"
                        placeholder="#e05a2b"
                        maxLength={7}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                    Used for buttons, links, and focus states throughout the app
                </p>
            </div>

            {/* Default Report Cover */}
            <div>
                <label className="block text-sm font-medium mb-2">Default Report Cover</label>
                <div className="flex items-start gap-4">
                    {reportCoverUrl ? (
                        <a
                            href={reportCoverUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click to preview full-size"
                            className="w-32 h-44 rounded-xl border border-border bg-muted/30 overflow-hidden block group"
                        >
                            {/* Inline PDF thumbnail — clicking the link opens the full preview.
                                pointer-events-none lets the parent <a> catch clicks. */}
                            <iframe
                                src={`${reportCoverUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                                className="w-full h-full pointer-events-none"
                                title="Report cover preview"
                            />
                        </a>
                    ) : (
                        <div className="w-32 h-44 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 text-center p-3">
                            <span className="text-xs text-muted-foreground leading-snug">
                                No cover — a default one is generated
                            </span>
                        </div>
                    )}
                    <div className="space-y-2 flex-1">
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            {uploadingCover ? "Uploading..." : "Upload Report Cover"}
                        </button>
                        {reportCoverUrl && (
                            <button
                                onClick={() => setReportCoverUrl("")}
                                className="block text-xs text-destructive hover:underline"
                            >
                                Remove cover
                            </button>
                        )}
                        <p className="text-xs text-muted-foreground">
                            PDF only — all pages are prepended to every report. Portrait A4
                            sizing is ideal. Max 10MB. Individual templates can override this
                            from the template builder. Leave empty to auto-generate a cover
                            with your logo and the report details.
                        </p>
                    </div>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleCoverUpload}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Save */}
            <div className="pt-4 border-t border-border">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-foreground text-background font-medium text-sm rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
