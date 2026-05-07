"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MODULE_TREE } from "./types";

interface Props {
    tenantId: string;
}

type Module = { module_id: string; enabled: boolean };

export function TenantModulesTab({ tenantId }: Props) {
    const [modules, setModules] = useState<Module[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/platform-admin/tenant-config/modules?tenant_id=${tenantId}`);
                const json = await res.json();
                if (cancelled) return;
                setModules(json.modules || []);
                setLoaded(true);
            } catch {
                if (!cancelled) toast.error("Failed to load modules");
            }
        })();
        return () => { cancelled = true; };
    }, [tenantId]);

    const isEnabled = useCallback((moduleId: string) => {
        const mod = modules.find((m) => m.module_id === moduleId);
        return mod?.enabled ?? true;
    }, [modules]);

    const toggle = useCallback((moduleId: string) => {
        setModules((prev) => {
            const existing = prev.find((m) => m.module_id === moduleId);
            const newEnabled = existing ? !existing.enabled : false;
            let next = existing
                ? prev.map((m) => m.module_id === moduleId ? { ...m, enabled: newEnabled } : m)
                : [...prev, { module_id: moduleId, enabled: false }];

            // If toggling a workspace-level module, also toggle children
            const workspace = MODULE_TREE.find((w) => w.id === moduleId);
            if (workspace) {
                const childIds = workspace.children.map((c) => c.id);
                next = next.map((m) => childIds.includes(m.module_id) ? { ...m, enabled: newEnabled } : m);
                for (const childId of childIds) {
                    if (!next.find((m) => m.module_id === childId)) {
                        next.push({ module_id: childId, enabled: newEnabled });
                    }
                }
            }
            return next;
        });
    }, []);

    const save = useCallback(async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/platform-admin/tenant-config/modules", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant_id: tenantId, modules }),
            });
            if (res.ok) toast.success("Modules saved");
            else toast.error("Failed to save modules");
        } catch {
            toast.error("Failed to save modules");
        } finally {
            setSaving(false);
        }
    }, [tenantId, modules]);

    if (!loaded) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-40 bg-secondary rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {MODULE_TREE.map((workspace) => (
                <div key={workspace.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                            {workspace.workspace}
                        </p>
                        <button
                            type="button"
                            onClick={() => toggle(workspace.id)}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                isEnabled(workspace.id) ? "bg-foreground" : "bg-secondary"
                            )}
                        >
                            <span
                                className={cn(
                                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
                                    isEnabled(workspace.id) ? "translate-x-4" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    <div className="space-y-2 pl-3 border-l border-border/50 ml-1">
                        {workspace.children.map((child) => (
                            <div key={child.id} className="flex items-center justify-between py-1">
                                <span className="text-sm text-foreground">{child.label}</span>
                                <button
                                    type="button"
                                    onClick={() => toggle(child.id)}
                                    className={cn(
                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                        isEnabled(child.id) ? "bg-foreground" : "bg-secondary"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform",
                                            isEnabled(child.id) ? "translate-x-4" : "translate-x-0"
                                        )}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className="pt-2">
                <Button onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
