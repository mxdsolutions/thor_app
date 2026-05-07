"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronDown as ChevronDownIcon, IconX as XMarkIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import type { StatusItem } from "@/lib/status-config";
import { PRESET_COLORS } from "./types";

interface Props {
    tenantId: string;
}

export function TenantStatusesTab({ tenantId }: Props) {
    const [jobStatuses, setJobStatuses] = useState<StatusItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(["job"]));
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/platform-admin/tenant-config/status?tenant_id=${tenantId}&entity_type=job`);
                const json = await res.json();
                if (cancelled) return;
                setJobStatuses(json.statuses || []);
                setLoaded(true);
                setDirty(new Set());
            } catch {
                if (!cancelled) toast.error("Failed to load statuses");
            }
        })();
        return () => { cancelled = true; };
    }, [tenantId]);

    const toggleSection = useCallback((section: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    }, []);

    const markDirty = useCallback((entityType: string) => {
        setDirty((prev) => new Set(prev).add(entityType));
    }, []);

    const updateLabel = useCallback((entityType: string, index: number, label: string) => {
        setJobStatuses((prev) => prev.map((s, i) => i === index ? { ...s, label, id: label.toLowerCase().replace(/\s+/g, "_") } : s));
        markDirty(entityType);
    }, [markDirty]);

    const updateColor = useCallback((entityType: string, index: number, color: string) => {
        setJobStatuses((prev) => prev.map((s, i) => i === index ? { ...s, color } : s));
        markDirty(entityType);
        setColorPickerOpen(null);
    }, [markDirty]);

    const deleteStatus = useCallback((entityType: string, index: number) => {
        setJobStatuses((prev) => prev.filter((_, i) => i !== index));
        markDirty(entityType);
    }, [markDirty]);

    const addStatus = useCallback((entityType: string) => {
        const newStatus: StatusItem = {
            id: `new_status_${Date.now()}`,
            label: "New Status",
            color: "bg-blue-500",
            is_default: false,
            behaviors: [],
        };
        setJobStatuses((prev) => [...prev, newStatus]);
        markDirty(entityType);
    }, [markDirty]);

    const save = useCallback(async () => {
        setSaving(true);
        try {
            const promises: Promise<Response>[] = [];
            if (dirty.has("job")) {
                promises.push(fetch("/api/platform-admin/tenant-config/status", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenant_id: tenantId, entity_type: "job", statuses: jobStatuses }),
                }));
            }
            const results = await Promise.all(promises);
            if (results.every((r) => r.ok)) {
                toast.success("Statuses saved");
                setDirty(new Set());
            } else {
                toast.error("Failed to save some statuses");
            }
        } catch {
            toast.error("Failed to save statuses");
        } finally {
            setSaving(false);
        }
    }, [tenantId, dirty, jobStatuses]);

    if (!loaded) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-40 bg-secondary rounded-xl" />
            </div>
        );
    }

    const sections = [
        { key: "job", label: "Job Statuses", items: jobStatuses },
    ] as const;

    return (
        <div className="space-y-4">
            {sections.map(({ key, label, items }) => (
                <div key={key} className="rounded-xl border border-border bg-card">
                    <button
                        type="button"
                        onClick={() => toggleSection(key)}
                        className="w-full flex items-center justify-between p-5 pb-3"
                    >
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                            {label}
                        </p>
                        <ChevronDownIcon
                            className={cn(
                                "w-4 h-4 text-muted-foreground/60 transition-transform",
                                openSections.has(key) && "rotate-180"
                            )}
                        />
                    </button>

                    {openSections.has(key) && (
                        <div className="px-5 pb-5 space-y-2">
                            {items.map((status, index) => (
                                <div
                                    key={status.id + index}
                                    className="group flex items-center gap-3 py-1.5"
                                >
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setColorPickerOpen(
                                                colorPickerOpen === `${key}-${index}` ? null : `${key}-${index}`
                                            )}
                                            className={cn("w-3 h-3 rounded-full shrink-0 cursor-pointer ring-1 ring-border/30", status.color)}
                                        />
                                        {colorPickerOpen === `${key}-${index}` && (
                                            <div className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 w-[148px]">
                                                {PRESET_COLORS.map((c) => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => updateColor(key, index, c)}
                                                        className={cn(
                                                            "w-5 h-5 rounded-full ring-1 ring-border/30 hover:scale-110 transition-transform",
                                                            c,
                                                            status.color === c && "ring-2 ring-foreground"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        value={status.label}
                                        onChange={(e) => updateLabel(key, index, e.target.value)}
                                        className="flex-1 text-sm bg-transparent border-0 border-b border-transparent focus:border-border focus:outline-none py-0.5 text-foreground"
                                    />

                                    {status.is_default && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0">
                                            Default
                                        </Badge>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => deleteStatus(key, index)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => addStatus(key)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Add Status
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <div className="pt-2">
                <Button onClick={save} disabled={saving || dirty.size === 0}>
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
