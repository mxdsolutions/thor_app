"use client";

import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface MobileFiltersProps {
    children: React.ReactNode;
}

/**
 * Wraps filter controls for responsive display.
 * - Desktop (md+): renders children inline in a flex row
 * - Mobile: hides children, shows a filter icon button that opens a bottom sheet
 */
export function MobileFilters({ children }: MobileFiltersProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Desktop — inline filters */}
            <div className="hidden md:flex items-center gap-2">
                {children}
            </div>

            {/* Mobile — filter button + bottom sheet */}
            <Button
                variant="outline"
                size="icon"
                className="md:hidden shrink-0 rounded-lg h-10 w-10"
                onClick={() => setOpen(true)}
            >
                <Filter className="w-4 h-4" />
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader className="pb-2">
                        <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-3 pb-4 [&_button[role=combobox]]:!w-full">
                        {children}
                    </div>
                    <Button
                        className="w-full rounded-lg"
                        onClick={() => setOpen(false)}
                    >
                        Apply Filters
                    </Button>
                </SheetContent>
            </Sheet>
        </>
    );
}
