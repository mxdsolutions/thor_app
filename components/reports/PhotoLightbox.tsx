"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PhotoItem } from "@/lib/report-templates/types";

interface PhotoLightboxProps {
    photos: PhotoItem[];
    initialIndex: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCaptionChange: (index: number, caption: string) => void;
    readOnly?: boolean;
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
    }),
};

export function PhotoLightbox({
    photos,
    initialIndex,
    open,
    onOpenChange,
    onCaptionChange,
    readOnly,
}: PhotoLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync when initialIndex changes (lightbox reopened on a different photo)
    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex);
            setDirection(0);
        }
    }, [initialIndex, open]);

    const photo = photos[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === photos.length - 1;

    const goTo = useCallback(
        (newIndex: number) => {
            if (newIndex < 0 || newIndex >= photos.length) return;
            setDirection(newIndex > currentIndex ? 1 : -1);
            setCurrentIndex(newIndex);
        },
        [currentIndex, photos.length]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Don't intercept arrows when typing in the textarea
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "TEXTAREA" || tag === "INPUT") return;

            if (e.key === "ArrowLeft" && !isFirst) {
                e.preventDefault();
                goTo(currentIndex - 1);
            } else if (e.key === "ArrowRight" && !isLast) {
                e.preventDefault();
                goTo(currentIndex + 1);
            }
        },
        [currentIndex, isFirst, isLast, goTo]
    );

    if (!photo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden"
                onKeyDown={handleKeyDown}
            >
                <DialogTitle className="sr-only">
                    Photo {currentIndex + 1} of {photos.length}
                </DialogTitle>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg h-8 w-8"
                        disabled={isFirst}
                        onClick={() => goTo(currentIndex - 1)}
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                        Photo {currentIndex + 1} of {photos.length}
                    </span>
                    {/* Spacer — the DialogContent already renders its own close X at top-right */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg h-8 w-8"
                        disabled={isLast}
                        onClick={() => goTo(currentIndex + 1)}
                    >
                        <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                </div>

                {/* Image area */}
                <div className="flex-1 min-h-0 relative bg-black/5 overflow-hidden">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center p-4"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.url}
                                alt={photo.caption || photo.filename}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Caption area */}
                <div className="shrink-0 border-t border-border p-4 bg-background">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5 truncate">
                        {photo.filename}
                    </p>
                    {readOnly ? (
                        <p className="text-sm text-foreground min-h-[40px]">
                            {photo.caption || (
                                <span className="text-muted-foreground/50 italic">No caption</span>
                            )}
                        </p>
                    ) : (
                        <Textarea
                            ref={textareaRef}
                            placeholder="Describe what this photo shows..."
                            value={photo.caption || ""}
                            onChange={(e) => onCaptionChange(currentIndex, e.target.value)}
                            className={cn(
                                "rounded-xl border-border/50 text-base resize-none min-h-[60px]",
                                "focus-visible:ring-1 focus-visible:ring-ring"
                            )}
                            rows={2}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
