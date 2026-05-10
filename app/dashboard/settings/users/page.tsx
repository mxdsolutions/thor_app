"use client";

import { useEffect, useState } from "react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, type AppUser, getInitials, getDisplayName, formatLastActive } from "@/lib/utils";
import { IconSearch as MagnifyingGlassIcon, IconUserPlus as UserPlusIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { useProfiles } from "@/lib/swr";
import { UserInviteModal } from "@/components/dashboard/UserInviteModal";
import { UserSideSheet } from "@/components/dashboard/UserSideSheet";
import { MobileFilters } from "@/components/dashboard/MobileFilters";
import { resendInvite } from "@/app/actions/resendInvite";

type UserTab = "all" | "owner" | "admin" | "manager" | "member" | "viewer";

export default function UsersPage() {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<UserTab>("all");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const { data, error, isLoading, mutate } = useProfiles();
    const users: AppUser[] = (data?.users ?? []) as AppUser[];

    useEffect(() => {
        if (error) toast.error("Could not load users. Please check your Supabase connection.");
    }, [error]);

    const filteredUsers = users.filter((user) => {
        const name = getDisplayName(user).toLowerCase();
        const email = user.email.toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = name.includes(q) || email.includes(q);
        if (!matchesSearch) return false;
        if (activeTab === "all") return true;
        return user.tenant_role === activeTab;
    });

    const handleResend = (email: string) => {
        toast.promise(
            (async () => {
                const res = await resendInvite(email);
                if (!res.success) throw new Error(res.error);
                mutate();
                return res;
            })(),
            {
                loading: `Resending invitation to ${email}…`,
                success: `Invitation resent to ${email}`,
                error: (err) =>
                    err instanceof Error ? err.message : "Failed to resend invitation",
            },
        );
    };

    return (
        <>
            <UserInviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
            <UserSideSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                user={selectedUser}
                onUpdate={() => { void mutate(); }}
            />

            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-1 min-w-0 sm:min-w-[320px] max-w-xl">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-9 rounded-xl border-border/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <MobileFilters>
                        <Select value={activeTab} onValueChange={(v) => setActiveTab(v as UserTab)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="owner">Owners</SelectItem>
                                <SelectItem value="admin">Admins</SelectItem>
                                <SelectItem value="manager">Managers</SelectItem>
                                <SelectItem value="member">Members</SelectItem>
                                <SelectItem value="viewer">Viewers</SelectItem>
                            </SelectContent>
                        </Select>
                    </MobileFilters>
                </div>
                <Button className="px-6 shrink-0" onClick={() => setInviteOpen(true)}>
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Invite User</span>
                    <span className="sm:hidden">Invite</span>
                </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 pr-4"}>User</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Role</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
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
                            filteredUsers.map((user) => {
                                const pending = user.is_pending === true;
                                const statusLabel = pending ? "Invited" : user.last_sign_in_at ? "Active" : "Pending";
                                const statusClass = pending
                                    ? "bg-amber-500/10 text-amber-600 border-0"
                                    : user.last_sign_in_at
                                        ? "bg-emerald-500/10 text-emerald-600 border-0"
                                        : "text-muted-foreground";
                                return (
                                    <tr
                                        key={user.id}
                                        className={cn(
                                            tableRow,
                                            pending
                                                ? "cursor-default opacity-80"
                                                : "cursor-pointer hover:bg-muted/50 transition-colors",
                                        )}
                                        onClick={pending ? undefined : () => { setSelectedUser(user); setIsSheetOpen(true); }}
                                    >
                                        <td className={tableCell + " pl-4 pr-4"}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                    {getInitials(user)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold truncate">{getDisplayName(user)}</p>
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
                                                    statusClass,
                                                )}
                                            >
                                                {statusLabel}
                                            </Badge>
                                        </td>
                                        <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                            {(() => {
                                                // Resend on every row that hasn't actually used the app —
                                                // both "Invited" (no membership yet) and "Pending"
                                                // (membership but never signed in) need the email again.
                                                const showResend = pending || !user.last_sign_in_at;
                                                const lastActiveText = pending
                                                    ? `Invited ${formatLastActive(user.created_at)}`
                                                    : formatLastActive(user.last_sign_in_at);
                                                if (!showResend) return lastActiveText;
                                                return (
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>{lastActiveText}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleResend(user.email); }}
                                                            className="text-xs font-medium text-primary hover:underline shrink-0"
                                                        >
                                                            Resend
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
