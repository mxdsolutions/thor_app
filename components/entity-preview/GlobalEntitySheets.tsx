"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { subscribeEntitySheet } from "@/lib/entity-sheet-bus";
import { useEntityPreview, type EntityPreviewType } from "@/lib/swr";
import type { AppUser } from "@/lib/utils";

const ContactSideSheet = lazy(() =>
    import("@/components/sheets/ContactSideSheet").then((m) => ({ default: m.ContactSideSheet })),
);
const CompanySideSheet = lazy(() =>
    import("@/components/sheets/CompanySideSheet").then((m) => ({ default: m.CompanySideSheet })),
);
const InvoiceSideSheet = lazy(() =>
    import("@/components/sheets/InvoiceSideSheet").then((m) => ({ default: m.InvoiceSideSheet })),
);
const QuoteSideSheet = lazy(() =>
    import("@/components/sheets/QuoteSideSheet").then((m) => ({ default: m.QuoteSideSheet })),
);
const JobSideSheet = lazy(() =>
    import("@/components/sheets/JobSideSheet").then((m) => ({ default: m.JobSideSheet })),
);
const UserSideSheet = lazy(() =>
    import("@/components/dashboard/UserSideSheet").then((m) => ({ default: m.UserSideSheet })),
);

type ActiveRequest = { type: EntityPreviewType; id: string } | null;

/** Mounted once per dashboard. Listens for entity-sheet bus events from
 *  hover/preview cards anywhere in the tree and renders the matching side
 *  sheet on top of any page-local sheets that may already be open. */
export function GlobalEntitySheets() {
    const [active, setActive] = useState<ActiveRequest>(null);

    useEffect(() => {
        return subscribeEntitySheet((req) => {
            setActive(req);
        });
    }, []);

    const close = () => setActive(null);

    if (!active) return null;

    return (
        <Suspense fallback={null}>
            <ActiveSheet request={active} onClose={close} />
        </Suspense>
    );
}

function ActiveSheet({ request, onClose }: { request: NonNullable<ActiveRequest>; onClose: () => void }) {
    // Re-uses the same `useEntityPreview` cache as the hover popover, so the
    // sheet typically opens with cached data instantly.
    const { data, isLoading } = useEntityPreview(request.type, request.id);
    const item = data?.item ?? null;

    // Don't render the sheet until we have the record — the side sheets bail
    // out when their entity prop is null, which would briefly show nothing.
    if (isLoading && !item) return null;
    if (!item) return null;

    const handleOpenChange = (open: boolean) => { if (!open) onClose(); };

    switch (request.type) {
        case "contact":
            return (
                <ContactSideSheet
                    contact={item as Parameters<typeof ContactSideSheet>[0]["contact"]}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
        case "company":
            return (
                <CompanySideSheet
                    company={item as Parameters<typeof CompanySideSheet>[0]["company"]}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
        case "invoice":
            return (
                <InvoiceSideSheet
                    invoice={item as Parameters<typeof InvoiceSideSheet>[0]["invoice"]}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
        case "quote":
            return (
                <QuoteSideSheet
                    quote={item as Parameters<typeof QuoteSideSheet>[0]["quote"]}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
        case "job":
            return (
                <JobSideSheet
                    job={item as Parameters<typeof JobSideSheet>[0]["job"]}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
        case "user":
            return (
                <UserSideSheet
                    user={item as AppUser}
                    open
                    onOpenChange={handleOpenChange}
                />
            );
    }
}
