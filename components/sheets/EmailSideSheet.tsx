"use client";

import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EmailMessage = {
    id: string;
    subject: string;
    body?: { contentType: string; content: string };
    bodyPreview?: string;
    from: { emailAddress: { name: string; address: string } };
    toRecipients: { emailAddress: { name: string; address: string } }[];
    ccRecipients?: { emailAddress: { name: string; address: string } }[];
    receivedDateTime: string;
    isRead: boolean;
    hasAttachments: boolean;
};

type MatchedContact = { id: string; first_name: string; last_name: string };

interface EmailSideSheetProps {
    emailId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchedContacts?: Record<string, MatchedContact>;
}

export function EmailSideSheet({ emailId, open, onOpenChange, matchedContacts = {} }: EmailSideSheetProps) {
    const [email, setEmail] = useState<EmailMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"email" | "details">("email");
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);
    const [showReply, setShowReply] = useState(false);

    const fetchEmail = async (id: string) => {
        setLoading(true);
        setShowReply(false);
        setReplyText("");
        try {
            const res = await fetch(`/api/email/messages/${id}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setEmail(data.message);
        } catch {
            toast.error("Failed to load email");
        } finally {
            setLoading(false);
        }
    };

    // Fetch when opened with a new email ID
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setEmail(null);
            setActiveTab("email");
        }
        onOpenChange(isOpen);
    };

    // Trigger fetch when emailId changes and sheet is open
    if (open && emailId && (!email || email.id !== emailId) && !loading) {
        fetchEmail(emailId);
    }

    const handleReply = async () => {
        if (!email || !replyText.trim()) return;
        setReplying(true);
        try {
            const res = await fetch(`/api/email/messages/${email.id}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment: replyText }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to send reply");
            }
            toast.success("Reply sent");
            setReplyText("");
            setShowReply(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send reply");
        } finally {
            setReplying(false);
        }
    };

    const senderName = email?.from?.emailAddress?.name || email?.from?.emailAddress?.address || "Unknown";
    const senderEmail = email?.from?.emailAddress?.address || "";
    const senderInitials = senderName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const senderContact = matchedContacts[senderEmail.toLowerCase()];

    const tabs = [
        { id: "email" as const, label: "Email" },
        { id: "details" as const, label: "Details" },
    ];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("en-AU", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 border-l border-border bg-background">
                {loading || !email ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            {loading ? "Loading..." : "No email selected"}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-border">
                            <SheetHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center font-bold text-lg text-foreground ring-1 ring-border/50 shrink-0 mt-0.5">
                                    {senderInitials}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-2.5">
                                        <SheetTitle className="text-xl font-bold truncate">
                                            {email.subject || "(No subject)"}
                                        </SheetTitle>
                                        {!email.isRead && (
                                            <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                                                Unread
                                            </Badge>
                                        )}
                                        {email.hasAttachments && (
                                            <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Attachments
                                            </Badge>
                                        )}
                                    </div>
                                    <SheetDescription className="text-sm text-muted-foreground mt-1 truncate">
                                        From {senderName}
                                        {senderContact && (
                                            <span className="text-blue-600 ml-1.5">
                                                (CRM: {senderContact.first_name} {senderContact.last_name})
                                            </span>
                                        )}
                                        {" · "}
                                        {formatDate(email.receivedDateTime)}
                                    </SheetDescription>
                                </div>
                            </SheetHeader>
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-col flex-1 min-h-0 bg-secondary/20">
                            <div className="flex gap-1 px-6 py-3 border-b border-border bg-background">
                                <div className="flex gap-1 p-1 rounded-lg bg-secondary">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                                                activeTab === tab.id
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-y-auto">
                                {activeTab === "email" && (
                                    <div className="p-6 space-y-4">
                                        {/* Email body */}
                                        {email.body?.content ? (
                                            <div
                                                className="prose prose-sm max-w-none text-foreground [&_a]:text-blue-600 [&_img]:max-w-full"
                                                dangerouslySetInnerHTML={{ __html: email.body.content }}
                                            />
                                        ) : (
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {email.bodyPreview || "No content"}
                                            </p>
                                        )}

                                        {/* Reply section */}
                                        {!showReply ? (
                                            <div className="pt-4 border-t border-border">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowReply(true)}
                                                >
                                                    Reply
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="pt-4 border-t border-border space-y-3">
                                                <textarea
                                                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                                                    placeholder="Write your reply..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleReply}
                                                        disabled={replying || !replyText.trim()}
                                                    >
                                                        {replying ? "Sending..." : "Send Reply"}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setShowReply(false); setReplyText(""); }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "details" && (
                                    <div className="p-6 space-y-4">
                                        <DetailRow label="From" value={`${senderName} <${senderEmail}>`} />
                                        <DetailRow
                                            label="To"
                                            value={email.toRecipients?.map((r) => `${r.emailAddress.name || r.emailAddress.address}`).join(", ") || "—"}
                                        />
                                        {email.ccRecipients && email.ccRecipients.length > 0 && (
                                            <DetailRow
                                                label="CC"
                                                value={email.ccRecipients.map((r) => `${r.emailAddress.name || r.emailAddress.address}`).join(", ")}
                                            />
                                        )}
                                        <DetailRow label="Date" value={formatDate(email.receivedDateTime)} />
                                        <DetailRow label="Attachments" value={email.hasAttachments ? "Yes" : "None"} />

                                        {/* CRM matches */}
                                        {Object.keys(matchedContacts).length > 0 && (
                                            <div className="pt-4 border-t border-border">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Linked Contacts</p>
                                                <div className="space-y-2">
                                                    {Object.entries(matchedContacts).map(([emailAddr, contact]) => (
                                                        <div key={emailAddr} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                                                {contact.first_name[0]}{contact.last_name[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{contact.first_name} {contact.last_name}</p>
                                                                <p className="text-xs text-muted-foreground">{emailAddr}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-foreground break-all">{value}</span>
        </div>
    );
}
