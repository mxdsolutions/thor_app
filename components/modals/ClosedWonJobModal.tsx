"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ClosedWonJobModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadTitle: string;
    onConfirm: () => void;
    onSkip: () => void;
}

export function ClosedWonJobModal({ open, onOpenChange, leadTitle, onConfirm, onSkip }: ClosedWonJobModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create a Job?</DialogTitle>
                    <DialogDescription>
                        <span className="font-medium text-foreground">{leadTitle}</span> has been marked as Closed Won. Would you like to create a job from this lead?
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onSkip}>
                        No, skip
                    </Button>
                    <Button onClick={onConfirm}>
                        Yes, create job
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
