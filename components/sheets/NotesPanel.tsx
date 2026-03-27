"use client";

import { useState, useEffect, useRef } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

type Note = {
    id: string;
    content: string;
    created_at: string;
    author?: {
        id: string;
        full_name: string;
    } | null;
};

interface NotesPanelProps {
    entityType: string;
    entityId: string;
}

export function NotesPanel({ entityType, entityId }: NotesPanelProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchNotes();
    }, [entityType, entityId]);

    const fetchNotes = async () => {
        try {
            const res = await fetch(`/api/notes?entity_type=${entityType}&entity_id=${entityId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setNotes(data.notes || []);
        } catch {
            toast.error("Failed to load notes");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (!trimmed || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity_type: entityType, entity_id: entityId, content: trimmed }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setNotes(prev => [data.note, ...prev]);
            setContent("");
            inputRef.current?.focus();
        } catch {
            toast.error("Failed to add note");
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Notes list */}
            <div className="flex-1 space-y-3 mb-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="rounded-xl bg-card border border-border p-4 animate-pulse">
                                <div className="h-3 bg-muted rounded-full w-3/4 mb-2" />
                                <div className="h-3 bg-muted rounded-full w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No notes yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add the first note below</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="rounded-xl bg-card border border-border p-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                {note.content}
                            </p>
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    {note.author?.full_name || "Unknown"}
                                </span>
                                <span className="text-[11px] text-muted-foreground/50">
                                    {timeAgo(note.created_at)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add note input */}
            <div className="sticky bottom-0 bg-secondary/20 pt-2">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <textarea
                        ref={inputRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a note..."
                        rows={2}
                        className="w-full px-4 pt-3 pb-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                        <span className="text-[10px] text-muted-foreground/40">
                            {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to send
                        </span>
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || submitting}
                            className={cn(
                                "text-xs font-semibold px-3 py-1 rounded-lg transition-colors",
                                content.trim()
                                    ? "text-primary hover:bg-primary/10"
                                    : "text-muted-foreground/30 cursor-not-allowed"
                            )}
                        >
                            {submitting ? "Sending..." : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
