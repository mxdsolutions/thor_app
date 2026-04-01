"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import { ScrollableTableLayout } from "@/components/dashboard/ScrollableTableLayout";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, type AppUser, getInitials, getDisplayName, formatLastActive } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    UserPlusIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserInviteModal } from "@/components/dashboard/UserInviteModal";
import { UserSideSheet } from "@/components/dashboard/UserSideSheet";

type UserTab = "all" | "owner" | "admin" | "manager" | "member" | "viewer";

export default function UsersPage() {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<UserTab>("all");
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteOpen, setInviteOpen] = useState(false);

    // User selection for side sheet
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers((data.users || []) as AppUser[]);
        } catch (err) {
            console.error(err);
            toast.error("Could not load users. Please check your Supabase connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const name = getDisplayName(user).toLowerCase();
        const email = user.email.toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = name.includes(q) || email.includes(q);

        if (!matchesSearch) return false;

        if (activeTab === "all") return true;

        return user.tenant_role === activeTab;
    });

    const handleUserClick = (user: AppUser) => {
        setSelectedUser(user);
        setIsSheetOpen(true);
    };

    return (
        <>
            <UserInviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
            <UserSideSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                user={selectedUser}
                onUpdate={fetchUsers}
            />

            <ScrollableTableLayout
                header={
                    <>
                        <DashboardHeader
                            title="Users"
                            subtitle="Manage your team members and their account permissions."
                        >
                            <Button className="rounded-full px-6 shrink-0" onClick={() => setInviteOpen(true)}>
                                <UserPlusIcon className="w-4 h-4 mr-2" />
                                Invite User
                            </Button>
                        </DashboardHeader>

                        <DashboardControls>
                            <div className="relative flex-1 max-w-sm">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-9 rounded-xl border-border/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </DashboardControls>

                        <div className="px-4 md:px-6 lg:px-10 border-b border-border/50">
                            <div className="flex gap-6 -mb-px">
                                {[
                                    { id: "all", label: "All" },
                                    { id: "owner", label: "Owners" },
                                    { id: "admin", label: "Admins" },
                                    { id: "manager", label: "Managers" },
                                    { id: "member", label: "Members" },
                                    { id: "viewer", label: "Viewers" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as UserTab)}
                                        className={cn(
                                            "pb-3 text-sm font-medium transition-colors relative",
                                            activeTab === tab.id
                                                ? "text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                }
            >
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead + " sticky top-0 z-10"}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>User</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Role</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-16 text-muted-foreground text-sm">
                                    Loading users...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-16 text-muted-foreground text-sm">
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className={cn(tableRow, "cursor-pointer hover:bg-muted/50 transition-colors")}
                                    onClick={() => handleUserClick(user)}
                                >
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                {getInitials(user)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{getDisplayName(user)}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <span className="text-sm capitalize text-muted-foreground">
                                            {user.tenant_role || user.user_metadata?.user_type || "member"}
                                        </span>
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "rounded-full px-2 py-0 text-[10px] uppercase tracking-wider font-bold",
                                                user.last_sign_in_at
                                                    ? "bg-emerald-500/10 text-emerald-600 border-0"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {user.last_sign_in_at ? "Active" : "Pending"}
                                        </Badge>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {formatLastActive(user.last_sign_in_at)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </ScrollableTableLayout>
        </>
    );
}
