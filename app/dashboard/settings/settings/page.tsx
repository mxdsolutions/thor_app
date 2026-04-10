"use client";

import { useState, useEffect } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { usePageTitle } from "@/lib/page-title-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IconUserCircle as UserCircleIcon, IconShieldCheck as ShieldCheckIcon } from "@tabler/icons-react";
import { IconRefresh as ArrowPathIcon } from "@tabler/icons-react";
import { toast } from "sonner";

export default function SettingsPage() {
    usePageTitle("Settings");
    const [user, setUser] = useState<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) throw new Error("Failed to fetch profile");
                const data = await res.json();
                setUser(data.user);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load profile settings");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });
            if (!res.ok) throw new Error("Failed to update profile");
            toast.success("Profile updated successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardPage className="max-w-4xl flex items-center justify-center min-h-[400px]">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-muted-foreground" />
            </DashboardPage>
        );
    }

    return (
        <DashboardPage className="max-w-4xl">
            <div className="px-4 md:px-6 lg:px-10 space-y-6">
                {/* Profile */}
                <Card className="border-border shadow-none rounded-2xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserCircleIcon className="w-5 h-5" /> Profile
                        </CardTitle>
                        <CardDescription>Your personal information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">First name</label>
                                <Input 
                                    value={user?.firstName || ""} 
                                    onChange={(e) => setUser(u => u ? {...u, firstName: e.target.value} : null)}
                                    className="rounded-xl" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Last name</label>
                                <Input 
                                    value={user?.lastName || ""} 
                                    onChange={(e) => setUser(u => u ? {...u, lastName: e.target.value} : null)}
                                    className="rounded-xl" 
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <Input 
                                value={user?.email || ""} 
                                onChange={(e) => setUser(u => u ? {...u, email: e.target.value} : null)}
                                type="email" 
                                className="rounded-xl" 
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="px-6"
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-border shadow-none rounded-2xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5" /> Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Password</p>
                                <p className="text-xs text-muted-foreground">Managed via authentication provider</p>
                            </div>
                            <Button variant="outline" className="text-sm px-5">Change</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/20 bg-destructive/5 shadow-none rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-destructive">Delete account</p>
                            <p className="text-xs text-muted-foreground">Once deleted, your data cannot be recovered.</p>
                        </div>
                        <Button variant="destructive" className="text-sm px-5">Delete</Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardPage>
    );
}
