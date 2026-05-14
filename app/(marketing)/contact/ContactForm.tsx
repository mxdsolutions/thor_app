"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TOPIC_OPTIONS = [
    { value: "sales", label: "Sales / pricing question" },
    { value: "demo", label: "Book a demo" },
    { value: "support", label: "Existing customer support" },
    { value: "other", label: "Something else" },
];

export function ContactForm() {
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [topic, setTopic] = useState("sales");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [company, setCompany] = useState("");
    const [message, setMessage] = useState("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) {
            toast.error("Name, email, and message are required.");
            return;
        }
        setSubmitting(true);
        // No backend wired up yet — this just simulates submit and shows success.
        // Hook up to a Resend / Slack webhook when that's ready.
        await new Promise((r) => setTimeout(r, 700));
        setSubmitting(false);
        setDone(true);
        toast.success("Message sent. We'll come back to you within one business day.");
    };

    if (done) {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 inline-flex items-center justify-center mb-4">
                    <Check className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <h3 className="font-statement text-2xl font-bold tracking-tight">Thanks — we got it.</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    We&apos;ll come back to you within one business day. Want to get started right now? Spin up a free trial.
                </p>
                <div className="mt-6">
                    <Button asChild size="sm">
                        <a href="/signup">Start free trial <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Name</label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Email</label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="company" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Company</label>
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your business" />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="topic" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Topic</label>
                    <Select value={topic} onValueChange={setTopic}>
                        <SelectTrigger id="topic">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TOPIC_OPTIONS.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="message" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Message</label>
                <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    required
                    placeholder="Tell us a bit about what you need…"
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
            </div>

            <Button type="submit" className="h-11 px-7 rounded-md text-[14px] font-medium" disabled={submitting}>
                {submitting ? "Sending…" : (
                    <>Send message <ArrowRight className="ml-2 w-3.5 h-3.5" /></>
                )}
            </Button>
        </form>
    );
}
