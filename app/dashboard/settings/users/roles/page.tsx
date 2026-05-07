"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { RESOURCES, RESOURCE_GROUPS, type PermissionAction } from "@/lib/permissions";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Role = {
    id: string;
    name: string;
    slug: string;
    is_system: boolean;
    permissions: Record<string, { read?: boolean; write?: boolean; delete?: boolean }>;
};

const ACTIONS: readonly PermissionAction[] = ["read", "write", "delete"] as const;

export default function RolesPage() {
    const tenant = useTenant();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchRoles = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from("tenant_roles")
            .select("*")
            .eq("tenant_id", tenant.id)
            .order("created_at");

        setRoles(data || []);
        setSelectedRole((prev) => prev ?? (data && data.length > 0 ? data[0] : null));
        setLoading(false);
    }, [tenant.id]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const togglePermission = (resourceKey: string, action: PermissionAction) => {
        if (!selectedRole) return;
        const perms = { ...selectedRole.permissions };
        const current = { ...(perms[resourceKey] || {}) };
        const next = !current[action];
        current[action] = next;

        // Cascade: enabling a higher action requires its prerequisites; disabling
        // a lower action clears dependent actions.
        if (action === "read" && !next) {
            current.write = false;
            current.delete = false;
        }
        if (action === "write") {
            if (next) current.read = true;
            else current.delete = false;
        }
        if (action === "delete" && next) {
            current.read = true;
            current.write = true;
        }

        perms[resourceKey] = current;
        setSelectedRole({ ...selectedRole, permissions: perms });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("tenant_roles")
                .update({ permissions: selectedRole.permissions })
                .eq("id", selectedRole.id);

            if (error) throw error;
            toast.success(`${selectedRole.name} role updated`);
            fetchRoles();
        } catch {
            toast.error("Failed to save permissions");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-48" />
                    <div className="h-4 bg-muted rounded w-72" />
                    <div className="h-64 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <p className="text-sm text-muted-foreground">
                    Configure what each role can access in your workspace
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Mobile: role dropdown */}
                <div className="md:hidden">
                    <Select
                        value={selectedRole?.id ?? ""}
                        onValueChange={(id) => {
                            const next = roles.find((r) => r.id === id);
                            if (next) setSelectedRole(next);
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                    {role.is_system ? " (System)" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Desktop: role list */}
                <div className="hidden md:block w-48 space-y-1 shrink-0">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={cn(
                                "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                selectedRole?.id === role.id
                                    ? "bg-secondary text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                            )}
                        >
                            {role.name}
                            {role.is_system && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground/60">System</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Permissions grid */}
                {selectedRole && (() => {
                    const isOwnerRole = selectedRole.slug === "owner";
                    return (
                        <div className="flex-1 border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold">{selectedRole.name} Permissions</h3>
                                {isOwnerRole && (
                                    <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                        Always full access
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-border/50">
                                {RESOURCE_GROUPS.map((groupName) => {
                                    const resourcesInGroup = RESOURCES.filter((r) => r.group === groupName);
                                    if (resourcesInGroup.length === 0) return null;
                                    return (
                                        <div key={groupName}>
                                            <div className="px-4 py-2 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                {groupName}
                                            </div>
                                            {resourcesInGroup.map((resource) => {
                                                const perms = selectedRole.permissions[resource.key] || {};
                                                return (
                                                    <div key={resource.key} className="flex items-center px-4 py-3 border-t border-border/40">
                                                        <span className="text-sm font-medium w-40 sm:w-56 shrink-0">{resource.label}</span>
                                                        <div className="flex gap-4 sm:gap-6">
                                                            {ACTIONS.map((action) => {
                                                                const supported = resource.actions.includes(action);
                                                                const cascadeBlocked =
                                                                    (action === "write" && !perms.read) ||
                                                                    (action === "delete" && !perms.write);
                                                                const disabled = isOwnerRole || !supported || cascadeBlocked;
                                                                const interactive = !disabled;
                                                                return (
                                                                    <label
                                                                        key={action}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5",
                                                                            interactive ? "cursor-pointer" : "opacity-30 cursor-not-allowed"
                                                                        )}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            disabled={disabled}
                                                                            checked={!!perms[action]}
                                                                            onChange={() => togglePermission(resource.key, action)}
                                                                            className="rounded border-border"
                                                                        />
                                                                        <span className="text-xs text-muted-foreground capitalize">{action}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="px-4 py-3 border-t border-border bg-muted/10">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || isOwnerRole}
                                    className="px-4 py-2 bg-foreground text-background font-medium text-sm rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
                                >
                                    {isOwnerRole ? "Owner role is locked" : saving ? "Saving..." : "Save Permissions"}
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
