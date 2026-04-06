"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { KeyedMutator } from "swr";

type UseKanbanPageOptions<T> = {
    /** The SWR hook result (data, isLoading, mutate) */
    swr: { data: { items: T[]; total: number } | undefined; isLoading: boolean; mutate: KeyedMutator<{ items: T[]; total: number }> };
    /** The API endpoint to PATCH status changes to */
    endpoint: string;
    /** The field name for the status/stage column (e.g., "status" or "stage") */
    statusField: string;
    /** Function to filter items by search query */
    searchFilter: (item: T, query: string) => boolean;
};

export function useKanbanPage<T extends { id: string }>({
    swr,
    endpoint,
    statusField,
    searchFilter,
}: UseKanbanPageOptions<T>) {
    const [search, setSearch] = useState("");
    const { data, isLoading, mutate } = swr;
    const items: T[] = data?.items || [];

    const filteredItems = search
        ? items.filter((item) => searchFilter(item, search.toLowerCase()))
        : items;

    const handleMove = async (itemId: string, _from: string, to: string, label: string) => {
        mutate(
            (current: { items: T[]; total: number } | undefined) =>
                current
                    ? {
                          ...current,
                          items: current.items.map((item) =>
                              item.id === itemId ? { ...item, [statusField]: to } : item
                          ),
                      }
                    : current,
            { revalidate: false }
        );

        try {
            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: itemId, [statusField]: to }),
            });
            if (!res.ok) throw new Error();
            toast.success(`Moved to ${label}`);
        } catch {
            mutate();
            toast.error("Failed to update status");
        }
    };

    return {
        search,
        setSearch,
        items,
        filteredItems,
        isLoading,
        mutate,
        handleMove,
        refresh: () => mutate(),
    };
}
