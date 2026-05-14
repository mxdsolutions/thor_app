"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconBan as BanIcon, IconMail as MailIcon, IconCopy as CopyIcon } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntitySearchDropdown, type EntityOption } from "@/components/ui/entity-search-dropdown";
import { useContactOptions, useReportShareTokens, type ReportShareToken } from "@/lib/swr";
import { timeAgo } from "@/lib/utils";

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
};

type SendReportFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportId: string;
};

const DEFAULT_EXPIRY_DAYS = 30;

export function SendReportFormModal({ open, onOpenChange, reportId }: SendReportFormModalProps) {
    const [contactId, setContactId] = useState("");
    const [selectedContact, setSelectedContact] = useState<EntityOption | null>(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const { data: contactsData, mutate: mutateContacts } = useContactOptions(open);
    const { data: tokensData, mutate: mutateTokens } = useReportShareTokens(open ? reportId : null);

    const contacts: Contact[] = useMemo(() => contactsData?.items || [], [contactsData]);
    const tokens: ReportShareToken[] = tokensData?.items ?? [];

    const contactOptions: EntityOption[] = useMemo(
        () => contacts
            .filter((c) => !!c.email) // can't email a contact without an email
            .map((c) => ({
                id: c.id,
                label: `${c.first_name} ${c.last_name}`.trim() || c.email || "Unnamed",
                subtitle: c.email,
            })),
        [contacts],
    );

    useEffect(() => {
        if (!open) {
            setContactId("");
            setSelectedContact(null);
            setMessage("");
            setSending(false);
        }
    }, [open]);

    const resolvedContact = useMemo(() => {
        if (!contactId) return null;
        return contacts.find((c) => c.id === contactId) ?? null;
    }, [contactId, contacts]);

    const recipientEmail = resolvedContact?.email || null;
    const recipientName = resolvedContact
        ? `${resolvedContact.first_name} ${resolvedContact.last_name}`.trim()
        : selectedContact?.label || null;

    const handleSend = async () => {
        if (!recipientEmail) {
            toast.error("Pick a contact with an email address");
            return;
        }

        setSending(true);
        try {
            const res = await fetch(`/api/reports/${reportId}/share-tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_name: recipientName,
                    recipient_email: recipientEmail,
                    message: message.trim() || null,
                    expires_in_days: DEFAULT_EXPIRY_DAYS,
                }),
            });

            const body = await res.json().catch(() => null);
            if (!res.ok) {
                const errMsg = (body && typeof body === "object" && "error" in body && typeof body.error === "string")
                    ? body.error
                    : "Failed to send";
                toast.error(errMsg);
                return;
            }

            const emailSent = !!body?.item?.email_sent_at;
            const emailError = typeof body?.email_error === "string" ? body.email_error : null;
            if (emailSent) {
                toast.success(`Sent to ${recipientName || recipientEmail}`);
            } else {
                // Surface the actual Resend / suppression / config error so the user
                // can act on it instead of guessing why the email didn't arrive.
                toast.error(
                    emailError
                        ? `Link created, but email failed: ${emailError}`
                        : "Link created — email failed to send, copy below",
                    { duration: 10000 },
                );
                if (body?.share_url) {
                    try { await navigator.clipboard.writeText(body.share_url); } catch { /* no-op */ }
                }
            }

            await mutateTokens();
            // Reset for another send, but keep the modal open so the user can review history.
            setContactId("");
            setSelectedContact(null);
            setMessage("");
        } finally {
            setSending(false);
        }
    };

    const handleCopy = async (token: string) => {
        const url = `${window.location.protocol}//${window.location.host}/r/${token}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied");
        } catch {
            toast.error("Couldn't copy link");
        }
    };

    const handleRevoke = async (tokenRow: ReportShareToken) => {
        const ok = confirm("Revoke this link? The recipient won't be able to open it again.");
        if (!ok) return;
        const res = await fetch(`/api/reports/${reportId}/share-tokens/${tokenRow.id}/revoke`, { method: "POST" });
        if (!res.ok) { toast.error("Failed to revoke"); return; }
        toast.success("Link revoked");
        await mutateTokens();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Send Report Form</DialogTitle>
                    <DialogDescription>
                        Pick a contact and we&apos;ll email them a link to complete this report — no login required.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4 pb-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Recipient</label>
                        <EntitySearchDropdown
                            value={contactId}
                            onChange={(id, opt) => {
                                setContactId(id);
                                setSelectedContact(opt ?? null);
                            }}
                            options={contactOptions}
                            placeholder="Search contacts…"
                            entityType="contact"
                            onCreated={() => mutateContacts()}
                        />
                        {contactId && !recipientEmail && (
                            <p className="text-[11px] text-amber-600">
                                This contact has no email on file. Add one or pick another.
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Message (optional)</label>
                        <textarea
                            placeholder="Hey — please complete this onsite assessment by Friday."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    {tokens.length > 0 && (
                        <div className="pt-2 border-t border-border space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Previously sent
                            </h4>
                            <ul className="space-y-1.5">
                                {tokens.map((t) => {
                                    const status = deriveStatus(t);
                                    const recipientLabel = t.recipient_name || t.recipient_email || "Anonymous";
                                    const canRevoke = !t.submitted_at && !t.revoked_at && new Date(t.expires_at).getTime() > Date.now();
                                    return (
                                        <li key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="truncate font-medium">{recipientLabel}</span>
                                                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${STATUS_COLOR[status]}`}>
                                                        {STATUS_LABEL[status]}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {statusDetail(t, status)}
                                                </div>
                                            </div>
                                            {canRevoke && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                        onClick={() => handleCopy(t.token)}
                                                        title="Copy link"
                                                    >
                                                        <CopyIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                                                        onClick={() => handleRevoke(t)}
                                                        title="Revoke link"
                                                    >
                                                        <BanIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSend}
                        disabled={!recipientEmail || sending}
                    >
                        <MailIcon className="w-4 h-4 mr-2" />
                        {sending ? "Sending…" : "Send"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type Status = "pending" | "opened" | "submitted" | "revoked" | "expired";

function deriveStatus(t: ReportShareToken): Status {
    if (t.revoked_at) return "revoked";
    if (t.submitted_at) return "submitted";
    if (new Date(t.expires_at).getTime() <= Date.now()) return "expired";
    if (t.first_opened_at) return "opened";
    return "pending";
}

function statusDetail(t: ReportShareToken, status: Status): string {
    if (status === "submitted" && t.submitted_at) {
        return `Submitted ${timeAgo(t.submitted_at)}`;
    }
    if (status === "opened" && t.first_opened_at) {
        return `Opened ${timeAgo(t.first_opened_at)}`;
    }
    if (status === "revoked" && t.revoked_at) {
        return `Revoked ${timeAgo(t.revoked_at)}`;
    }
    if (status === "expired") return `Expired ${timeAgo(t.expires_at)}`;
    return `Sent ${timeAgo(t.created_at)} · expires ${new Date(t.expires_at).toLocaleDateString("en-AU")}`;
}

const STATUS_COLOR: Record<Status, string> = {
    pending: "bg-slate-500/10 text-slate-700",
    opened: "bg-blue-500/10 text-blue-700",
    submitted: "bg-emerald-500/10 text-emerald-700",
    revoked: "bg-rose-500/10 text-rose-700",
    expired: "bg-amber-500/10 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
    pending: "Sent",
    opened: "Opened",
    submitted: "Submitted",
    revoked: "Revoked",
    expired: "Expired",
};
