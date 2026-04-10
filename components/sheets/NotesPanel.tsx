"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; full_name: string | null; email: string | null };

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

/** Renders note content with @mentions highlighted */
function NoteContent({ content, users }: { content: string; users: Profile[] }) {
    // Match @Name patterns — look for @ followed by a known user display name
    const userNames = users.map((u) => u.full_name || u.email || "").filter(Boolean);
    if (userNames.length === 0) {
        return <>{content}</>;
    }

    // Build regex that matches any known @username
    const escaped = userNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(@(?:${escaped.join("|")}))`, "g");
    const parts = content.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span
                        key={i}
                        className="inline-flex items-center bg-primary/10 text-primary text-[13px] font-medium rounded px-1 -mx-0.5"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

/** @mention dropdown */
function MentionDropdown({
    users,
    query,
    position,
    onSelect,
    selectedIndex,
}: {
    users: Profile[];
    query: string;
    position: { top: number; left: number };
    onSelect: (user: Profile) => void;
    selectedIndex: number;
}) {
    const filtered = users.filter((u) => {
        const name = (u.full_name || u.email || "").toLowerCase();
        return name.includes(query.toLowerCase());
    });

    if (filtered.length === 0) return null;

    return (
        <div
            className="absolute z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[200px] max-h-[180px] overflow-y-auto"
            style={{ bottom: position.top, left: position.left }}
        >
            {filtered.map((user, i) => (
                <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(user);
                    }}
                    className={cn(
                        "w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors",
                        i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                    )}
                >
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {(user.full_name || user.email || "?")[0].toUpperCase()}
                    </span>
                    <span className="truncate">{user.full_name || user.email}</span>
                </button>
            ))}
        </div>
    );
}

export function NotesPanel({ entityType, entityId }: NotesPanelProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);
    const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());

    // Mention dropdown state
    const [showMention, setShowMention] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch users for @mentions
    useEffect(() => {
        const supabase = createClient();
        supabase.from("profiles").select("id, full_name, email").then(({ data }) => {
            if (data) setUsers(data);
        });
    }, []);

    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch(`/api/notes?entity_type=${entityType}&entity_id=${entityId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setNotes(data.items || []);
        } catch {
            toast.error("Failed to load notes");
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (!trimmed || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity_type: entityType,
                    entity_id: entityId,
                    content: trimmed,
                    mentioned_user_ids: [...mentionedIds],
                }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setNotes(prev => [data.item, ...prev]);
            setContent("");
            setMentionedIds(new Set());
            inputRef.current?.focus();
        } catch {
            toast.error("Failed to add note");
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredUsers = useCallback(() => {
        return users.filter((u) => {
            const name = (u.full_name || u.email || "").toLowerCase();
            return name.includes(mentionQuery.toLowerCase());
        });
    }, [users, mentionQuery]);

    const selectMention = useCallback((user: Profile) => {
        if (mentionStart === null || !inputRef.current) return;
        const displayName = user.full_name || user.email || "";
        const before = content.slice(0, mentionStart);
        const after = content.slice(inputRef.current.selectionStart);
        const newContent = `${before}@${displayName} ${after}`;
        setContent(newContent);
        setMentionedIds((prev) => new Set(prev).add(user.id));
        setShowMention(false);
        setMentionQuery("");
        setMentionStart(null);

        // Move cursor after the inserted mention
        requestAnimationFrame(() => {
            if (inputRef.current) {
                const pos = before.length + displayName.length + 2; // +2 for @ and space
                inputRef.current.selectionStart = pos;
                inputRef.current.selectionEnd = pos;
                inputRef.current.focus();
            }
        });
    }, [content, mentionStart]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);

        const cursorPos = e.target.selectionStart;
        // Look backwards from cursor for an unmatched @
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAt = textBeforeCursor.lastIndexOf("@");

        if (lastAt !== -1) {
            const charBefore = lastAt > 0 ? textBeforeCursor[lastAt - 1] : " ";
            const query = textBeforeCursor.slice(lastAt + 1);
            // Only trigger if @ is at start or preceded by whitespace, and query has no newlines
            if ((charBefore === " " || charBefore === "\n" || lastAt === 0) && !query.includes("\n")) {
                setShowMention(true);
                setMentionQuery(query);
                setMentionStart(lastAt);
                setMentionIndex(0);
                return;
            }
        }
        setShowMention(false);
        setMentionQuery("");
        setMentionStart(null);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMention) {
            const filtered = getFilteredUsers();
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((prev) => (prev + 1) % filtered.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                if (filtered.length > 0) {
                    e.preventDefault();
                    selectMention(filtered[mentionIndex]);
                    return;
                }
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setShowMention(false);
                return;
            }
        }

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
                                <NoteContent content={note.content} users={users} />
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
                <div ref={wrapperRef} className="relative rounded-xl border border-border bg-card overflow-visible transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background">
                    {/* Mention dropdown — positioned above the textarea */}
                    {showMention && (
                        <MentionDropdown
                            users={users}
                            query={mentionQuery}
                            position={{ top: 8, left: 8 }}
                            onSelect={selectMention}
                            selectedIndex={mentionIndex}
                        />
                    )}
                    <textarea
                        ref={inputRef}
                        data-no-focus-style
                        value={content}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a note... Use @ to mention someone"
                        rows={2}
                        className="w-full px-4 pt-3 pb-1 text-sm bg-transparent resize-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                        <span className="text-[10px] text-muted-foreground/40">
                            {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+Enter to send
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
