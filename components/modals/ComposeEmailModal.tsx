"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ComposeEmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSent?: () => void;
    defaultTo?: string;
}

export function ComposeEmailModal({ open, onOpenChange, onSent, defaultTo }: ComposeEmailModalProps) {
    const [sending, setSending] = useState(false);
    const [to, setTo] = useState(defaultTo || "");
    const [cc, setCc] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [showCc, setShowCc] = useState(false);

    const reset = () => {
        setTo(defaultTo || "");
        setCc("");
        setSubject("");
        setBody("");
        setShowCc(false);
    };

    const handleSend = async () => {
        if (!to.trim() || !subject.trim() || !body.trim()) {
            toast.error("Please fill in To, Subject, and Body");
            return;
        }

        setSending(true);
        try {
            const toAddresses = to.split(",").map((e) => e.trim()).filter(Boolean);
            const ccAddresses = cc ? cc.split(",").map((e) => e.trim()).filter(Boolean) : undefined;

            const res = await fetch("/api/email/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: toAddresses,
                    cc: ccAddresses,
                    subject,
                    body,
                    contentType: "HTML",
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to send");
            }

            toast.success("Email sent");
            reset();
            onOpenChange(false);
            onSent?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Email</DialogTitle>
                    <DialogDescription>Compose and send an email from your connected Outlook account.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-muted-foreground">To</label>
                            {!showCc && (
                                <button
                                    type="button"
                                    onClick={() => setShowCc(true)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    + CC
                                </button>
                            )}
                        </div>
                        <Input
                            placeholder="recipient@example.com"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    {showCc && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">CC</label>
                            <Input
                                placeholder="cc@example.com"
                                value={cc}
                                onChange={(e) => setCc(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Subject</label>
                        <Input
                            placeholder="Email subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Body</label>
                        <textarea
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            placeholder="Write your email..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" size="sm" className="" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" className="" onClick={handleSend} disabled={sending}>
                            {sending ? "Sending..." : "Send Email"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
