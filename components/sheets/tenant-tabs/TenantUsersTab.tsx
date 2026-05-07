"use client";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted,
} from "@/lib/design-system";
import type { TenantMember } from "./types";

interface Props {
    members: TenantMember[] | undefined;
}

export function TenantUsersTab({ members }: Props) {
    if (!members || members.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">No members found</p>;
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-border">
            <table className={tableBase + " border-collapse min-w-full"}>
                <thead className={tableHead}>
                    <tr>
                        <th className={tableHeadCell + " pl-4 pr-4"}>Name</th>
                        <th className={tableHeadCell + " px-4"}>Email</th>
                        <th className={tableHeadCell + " px-4"}>Role</th>
                        <th className={tableHeadCell + " pl-4 pr-4"}>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((member) => (
                        <tr key={member.user_id} className={tableRow}>
                            <td className={tableCell + " pl-4 pr-4 font-medium"}>
                                {member.profiles?.full_name || "—"}
                            </td>
                            <td className={tableCellMuted + " px-4"}>
                                {member.profiles?.email || "—"}
                            </td>
                            <td className={tableCell + " px-4"}>
                                <Badge variant="secondary">{member.role}</Badge>
                            </td>
                            <td className={tableCellMuted + " pl-4 pr-4"}>
                                {timeAgo(member.joined_at)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
