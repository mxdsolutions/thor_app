"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Paperclip, X as IconX, Plus } from "lucide-react";
import useSWR from "swr";

export type EmailAttachment = {
    name: string;
    contentType: string;
    contentBytes: string; // base64
};

interface ComposeEmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSent?: () => void;
    defaultTo?: string;
    defaultSubject?: string;
    defaultBody?: string;
    defaultAttachments?: EmailAttachment[];
    signatureHtml?: string | null;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function buildInitialBody(defaultBody?: string, signatureHtml?: string | null): string {
    const parts: string[] = [];
    if (defaultBody) parts.push(defaultBody);
    if (signatureHtml) {
        parts.push('<p></p><p>--</p>');
        parts.push(signatureHtml);
    }
    return parts.join("");
}

export function ComposeEmailModal({ open, onOpenChange, onSent, defaultTo, defaultSubject, defaultBody, defaultAttachments, signatureHtml }: ComposeEmailModalProps) {
    const [sending, setSending] = useState(false);
    const [to, setTo] = useState(defaultTo || "");
    const [cc, setCc] = useState("");
    const [subject, setSubject] = useState(defaultSubject || "");
    const [body, setBody] = useState(() => buildInitialBody(defaultBody, signatureHtml));
    const [showCc, setShowCc] = useState(false);
    const [attachments, setAttachments] = useState<EmailAttachment[]>(defaultAttachments || []);

    // Fetch connected email address
    const { data: outlookData } = useSWR(open ? "/api/integrations/outlook" : null, fetcher);
    const fromEmail: string | null = outlookData?.connection?.email_address || null;

    // Sync defaults when modal opens with new values
    useEffect(() => {
        if (open) {
            setTo(defaultTo || "");
            setSubject(defaultSubject || "");
            setBody(buildInitialBody(defaultBody, signatureHtml));
            setAttachments(defaultAttachments || []);
        }
    }, [open, defaultTo, defaultSubject, defaultBody, defaultAttachments, signatureHtml]);

    const removeAttachment = (idx: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1];
                setAttachments(prev => [...prev, {
                    name: file.name,
                    contentType: file.type || "application/octet-stream",
                    contentBytes: base64,
                }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const reset = () => {
        setTo(defaultTo || "");
        setCc("");
        setSubject("");
        setBody(buildInitialBody(undefined, signatureHtml));
        setShowCc(false);
        setAttachments([]);
    };

    const handleSend = async () => {
        if (!to.trim() || !subject.trim()) {
            toast.error("Please fill in To and Subject");
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
                    attachments: attachments.length > 0 ? attachments : undefined,
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
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>New Email</DialogTitle>
                    <DialogDescription>Compose and send an email from your connected Outlook account.</DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4 pb-6">
                    {/* From */}
                    {fromEmail && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">From</span>
                            <span className="text-foreground">{fromEmail}</span>
                        </div>
                    )}

                    {/* To */}
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

                    {/* Subject */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Subject</label>
                        <Input
                            placeholder="Email subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Body — Rich Text Editor */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Body</label>
                        <RichTextEditor
                            value={body}
                            onChange={setBody}
                            placeholder="Write your email..."
                            className="min-h-[240px]"
                        />
                    </div>

                    {/* Attachments */}
                    <div className="flex flex-wrap items-center gap-2">
                        {attachments.map((att, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-sm"
                            >
                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[180px]">{att.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(idx)}
                                    className="p-0.5 rounded hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <IconX className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            Attach file
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                    </div>

                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSend} disabled={sending}>
                        {sending ? "Sending..." : "Send Email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
