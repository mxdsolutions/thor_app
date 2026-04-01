"use client";

import { ReactNode } from "react";

interface ScrollableTableLayoutProps {
    /** Header area (DashboardHeader + DashboardControls) — stays pinned at top */
    header: ReactNode;
    /** The table element — scrolls vertically, thead should use sticky top-0 */
    children: ReactNode;
    /** Optional footer (pagination) — stays pinned at bottom */
    footer?: ReactNode;
}

/**
 * Full-height layout for table pages: header pinned at top, table rows scroll,
 * optional footer (pagination) pinned at bottom.
 *
 * Usage:
 * ```tsx
 * <ScrollableTableLayout
 *     header={<><DashboardHeader .../><DashboardControls>...</DashboardControls></>}
 *     footer={<PaginationControls />}
 * >
 *     <table>...</table>
 * </ScrollableTableLayout>
 * ```
 */
export function ScrollableTableLayout({ header, children, footer }: ScrollableTableLayoutProps) {
    return (
        <div className="flex flex-col h-[calc(100vh-1.5rem-2rem)] lg:h-[calc(100vh-2rem-2rem)]">
            <div className="shrink-0 space-y-6">
                {header}
            </div>
            <div className="flex-1 min-h-0 overflow-auto mt-6">
                {children}
            </div>
            {footer && (
                <div className="shrink-0">
                    {footer}
                </div>
            )}
        </div>
    );
}
