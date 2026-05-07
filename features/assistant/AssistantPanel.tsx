"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, RefreshCw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, setOpen]);

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
                <>
                    {/* Backdrop — mobile only (taps dismiss) */}
                    <motion.div
                        key="assistant-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setOpen(false)}
                        className="md:hidden fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm"
                    />

                    {/* Panel — fixed overlay below xl, inline flex item at xl+ */}
                    <motion.aside
                        key="assistant-panel"
                        initial={{ width: 0 }}
                        animate={{ width: "var(--assistant-w)" }}
                        exit={{ width: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 280 }}
                        style={{ ["--assistant-w" as string]: "min(100vw, 420px)" }}
                        className="fixed inset-y-0 right-0 z-40 overflow-hidden bg-background border-l border-border shadow-2xl xl:static xl:inset-auto xl:z-auto xl:shadow-none xl:shrink-0 xl:bg-secondary xl:border-l-0 xl:rounded-[12px] xl:m-3"
                    >
                        <div className="h-full flex flex-col" style={{ width: "min(100vw, 420px)" }}>
                        <header className="h-14 px-5 flex items-center justify-center shrink-0 relative">
                            <p className="font-paladins text-[24px] tracking-[0.08em] text-foreground leading-none">
                                THOR<span className="font-sans text-[0.4em] font-semibold ml-[0.25em] align-super text-foreground/70 mt-[-2px] inline-block">AI</span>
                            </p>
                            <div className="flex items-center gap-1 absolute right-3">
                                {messages.length > 0 && (
                                    <button
                                        onClick={reset}
                                        title="New conversation"
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    title="Close"
                                    className="xl:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    aria-label="Close assistant"
                                >
                                    <X className="w-5 h-5" strokeWidth={2} />
                                </button>
                            </div>
                        </header>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col justify-center items-stretch text-center gap-6 py-12">
                                    <div>
                                        <p className="text-2xl font-semibold tracking-tight">How can I help?</p>
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

                        <form onSubmit={handleSubmit} className="p-3 shrink-0">
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 focus-within:border-foreground/30 transition-colors">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything…"
                                    rows={1}
                                    disabled={sending}
                                    className="flex-1 resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground py-1.5 leading-5 max-h-32"
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
                                    <Send className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                        </form>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-2 last:mb-0">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
    h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-base font-semibold mt-2 mb-2 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-sm font-semibold mt-2 mb-1.5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
    code: ({ children }: { children?: React.ReactNode }) => (
        <code className="bg-secondary px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>
    ),
    pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="bg-secondary p-2 rounded text-[12px] font-mono overflow-x-auto mb-2 last:mb-0">{children}</pre>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
            {children}
        </a>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-2 border-border pl-3 my-2 text-muted-foreground">{children}</blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-2">
            <table className="w-full text-[13px] border-collapse">{children}</table>
        </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border border-border px-2 py-1 text-left font-semibold bg-secondary/50">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border border-border px-2 py-1 align-top">{children}</td>
    ),
};

function Bubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === "user";
    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isUser
                        ? "bg-foreground text-background whitespace-pre-wrap"
                        : "bg-card border border-border text-foreground"
                )}
            >
                {isUser ? (
                    message.content
                ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {message.content}
                    </ReactMarkdown>
                )}
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
