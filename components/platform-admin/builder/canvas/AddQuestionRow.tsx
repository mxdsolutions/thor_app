"use client";

import { useEffect, useRef, useState } from "react";
import { Plus as PlusIcon } from "lucide-react";
import type { FieldType } from "@/lib/report-templates/types";
import {
    QUESTION_TYPE_META,
    PRIMARY_QUESTION_TYPES,
    SECONDARY_QUESTION_TYPES,
} from "../question-types";

interface AddQuestionRowProps {
    onAddQuestion: (type: FieldType) => void;
}

/**
 * "Add question" picker shown beneath the field grid in edit mode. Closed
 * state is a single dashed button; open state reveals two rows of
 * type-buttons (primary common types + the rest). `onAddQuestion` is
 * pre-bound by PageContent to the current section. Open state closes on
 * outside-click and on Escape.
 */
export function AddQuestionRow({ onAddQuestion }: AddQuestionRowProps) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handlePointer = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handlePointer);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handlePointer);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-background/50 hover:bg-secondary/30 hover:border-foreground/30 transition-colors py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
                <PlusIcon className="w-3.5 h-3.5" />
                Add question
            </button>
        );
    }

    return (
        <div ref={panelRef} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium">Add a question</p>
                <button
                    onClick={() => setOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </button>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                Common
            </p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
                {PRIMARY_QUESTION_TYPES.map((t) => {
                    const m = QUESTION_TYPE_META[t];
                    const Icon = m.icon;
                    return (
                        <button
                            key={t}
                            onClick={() => {
                                onAddQuestion(t);
                                setOpen(false);
                            }}
                            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background hover:bg-secondary/60 hover:border-foreground/20 active:scale-[0.97] transition-all py-2.5 px-1"
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-[10px] font-medium leading-tight text-center">
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                Other
            </p>
            <div className="grid grid-cols-6 gap-1.5">
                {SECONDARY_QUESTION_TYPES.map((t) => {
                    const m = QUESTION_TYPE_META[t];
                    const Icon = m.icon;
                    return (
                        <button
                            key={t}
                            onClick={() => {
                                onAddQuestion(t);
                                setOpen(false);
                            }}
                            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background hover:bg-secondary/60 hover:border-foreground/20 active:scale-[0.97] transition-all py-2.5 px-1"
                            title={m.label}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-[9px] font-medium leading-tight text-center">
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
