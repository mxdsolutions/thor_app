"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { JobDetailView, type JobDetailJob } from "@/components/jobs/JobDetailView";

interface JobSideSheetProps {
    job: JobDetailJob | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

/** Side sheet wrapper around the shared JobDetailView. Kept so the Schedule page
 *  can continue showing a job in a slide-over while the Jobs page uses the inline view. */
export function JobSideSheet({ job, open, onOpenChange, onUpdate }: JobSideSheetProps) {
    if (!job) return null;
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[900px] flex flex-col p-0 border-l border-border bg-background">
                <SheetHeader className="sr-only">
                    <SheetTitle>{job.job_title}</SheetTitle>
                    <SheetDescription>Job details</SheetDescription>
                </SheetHeader>
                <JobDetailView
                    job={job}
                    mode="sheet"
                    onUpdate={onUpdate}
                />
            </SheetContent>
        </Sheet>
    );
}
