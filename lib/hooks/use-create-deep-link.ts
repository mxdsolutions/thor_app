"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads `?create=1` off the URL, calls `open()` once, then strips the param.
 *
 * Used by the sidebar "+ Create" menu — each entry deep-links to its list
 * page (e.g. `/dashboard/jobs?create=1`); the page picks up the param and
 * auto-opens its create modal.
 */
export function useCreateDeepLink(open: () => void) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    useEffect(() => {
        if (searchParams.get("create") === "1") {
            open();
            router.replace(pathname, { scroll: false });
        }
        // Only re-run when the search params change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
}
