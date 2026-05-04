"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconX, IconSend, IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAssistant } from "./AssistantContext";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

const SUGGESTIONS = [
    "What jobs am I assigned to?",
    "How many quotes are still in draft?",
    "Find a contact named John",
    "Show overdue invoices",
];

export function AssistantPanel() {
    const { open, setOpen } = useAssistant();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, sending]);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || sending) return;
            setError(null);
            const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
            setMessages(next);
            setInput("");
            setSending(true);

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ messages: next }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(body?.error ?? `Request failed (${res.status})`);
                }
                const data = (await res.json()) as { reply: string };
                setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "(no answer)" }]);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong");
            } finally {
                setSending(false);
            }
        },
        [messages, sending]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        send(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input);
        }
    };

    const reset = () => {
        setMessages([]);
        setError(null);
        setInput("");
    };

    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.aside
                    key="assistant-panel"
                    initial={{ width: 0 }}
                    animate={{ width: "var(--assistant-w)" }}
                    exit={{ width: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 280 }}
                    style={{ ["--assistant-w" as string]: "min(100vw, 420px)" }}
                    className="shrink-0 overflow-hidden border-l border-border bg-background"
                >
                    <div className="h-dvh flex flex-col" style={{ width: "min(100vw, 420px)" }}>
                        <header className="h-20 px-5 flex items-center justify-between border-b border-border shrink-0">
                            <div className="min-w-0 leading-tight">
                                <p className="font-paladins text-[28px] tracking-[0.08em] text-foreground leading-none">
                                    THOR<span className="font-sans text-[0.38em] font-semibold ml-[0.25em] align-super text-foreground/70">AI</span>
                                </p>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-1 leading-none">Ask about your workspace</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {messages.length > 0 && (
                                    <button
                                        onClick={reset}
                                        title="New conversation"
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <IconRefresh className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    title="Close"
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <IconX className="w-5 h-5" />
                                </button>
                            </div>
                        </header>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col justify-center items-stretch text-center gap-6 py-12">
                                    <div>
                                        <p className="font-display font-bold uppercase text-2xl tracking-wide">How can I help?</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            I can answer questions about your jobs, contacts, companies, quotes and invoices.
                                        </p>
                                    </div>
                                    <div className="space-y-2 px-2">
                                        {SUGGESTIONS.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => send(s)}
                                                className="block w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((m, i) => <Bubble key={i} message={m} />)
                            )}
                            {sending && <ThinkingBubble />}
                            {error && (
                                <div className="rounded-xl border border-rose-300 bg-rose-50 text-rose-900 px-3 py-2 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="border-t border-border p-3 shrink-0">
                            <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-foreground/30 transition-colors">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything…"
                                    rows={1}
                                    disabled={sending}
                                    className="flex-1 resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground py-1 max-h-32"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || sending}
                                    className={cn(
                                        "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                        input.trim() && !sending
                                            ? "bg-foreground text-background hover:bg-foreground/90"
                                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                                    )}
                                    aria-label="Send"
                                >
                                    <IconSend className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

function Bubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";
    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                    isUser
                        ? "bg-foreground text-background"
                        : "bg-card border border-border text-foreground"
                )}
            >
                {message.content}
            </div>
        </div>
    );
}

function ThinkingBubble() {
    return (
        <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
            </div>
        </div>
    );
}
