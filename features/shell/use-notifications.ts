"use client";

import useSWR from "swr";

export type Notification = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    entity_type: string | null;
    entity_id: string | null;
    read: boolean;
    created_at: string;
    creator?: { id: string; full_name: string | null; email: string | null } | null;
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return { notifications: [], unread_count: 0 };
    return res.json();
};

export function useNotifications() {
    const { data, mutate } = useSWR("/api/notifications", fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });

    const notifications: Notification[] = data?.notifications || [];
    const unreadCount: number = data?.unread_count || 0;

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mark_all: true }),
            });
            mutate();
        } catch { /* silent */ }
    };

    const markOneRead = async (id: string) => {
        try {
            await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notification_ids: [id] }),
            });
            mutate();
        } catch { /* silent */ }
    };

    return { notifications, unreadCount, markAllRead, markOneRead, refresh: mutate };
}
