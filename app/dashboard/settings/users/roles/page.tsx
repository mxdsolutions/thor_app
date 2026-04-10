"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Role = {
    id: string;
    name: string;
    slug: string;
    is_system: boolean;
    permissions: Record<string, { read?: boolean; write?: boolean; delete?: boolean }>;
};

const PERMISSION_GROUPS = [
    { key: "crm", label: "CRM" },
    { key: "operations", label: "Operations" },
    { key: "settings", label: "Settings" },
    { key: "settings.users", label: "User Management" },
    { key: "settings.branding", label: "Branding" },
];

const ACTIONS = ["read", "write", "delete"] as const;

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

    const togglePermission = (group: string, action: string) => {
        if (!selectedRole) return;
        const perms = { ...selectedRole.permissions };
        if (!perms[group]) perms[group] = {};
        perms[group] = { ...perms[group], [action]: !perms[group][action as keyof typeof perms[typeof group]] };
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

            <div className="flex gap-6">
                {/* Role list */}
                <div className="w-48 space-y-1 shrink-0">
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
                {selectedRole && (
                    <div className="flex-1 border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border">
                            <h3 className="text-sm font-semibold">{selectedRole.name} Permissions</h3>
                        </div>
                        <div className="divide-y divide-border/50">
                            {PERMISSION_GROUPS.map((group) => (
                                <div key={group.key} className="flex items-center px-4 py-3">
                                    <span className="text-sm font-medium w-40 shrink-0">{group.label}</span>
                                    <div className="flex gap-6">
                                        {ACTIONS.map((action) => (
                                            <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedRole.permissions[group.key]?.[action]}
                                                    onChange={() => togglePermission(group.key, action)}
                                                    className="rounded border-border"
                                                />
                                                <span className="text-xs text-muted-foreground capitalize">{action}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-4 py-3 border-t border-border bg-muted/10">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Permissions"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
