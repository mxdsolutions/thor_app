"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tableBase, tableHead, tableHeadCell, tableRow, tableCell } from "@/lib/design-system";
import { PlusIcon, MagnifyingGlassIcon, EnvelopeIcon, LinkIcon } from "@heroicons/react/24/outline";
import { ComposeEmailModal } from "@/components/modals/ComposeEmailModal";
import { EmailSideSheet } from "@/components/sheets/EmailSideSheet";
import { toast } from "sonner";

type EmailMessage = {
    id: string;
    subject: string;
    bodyPreview: string;
    from: { emailAddress: { name: string; address: string } };
    toRecipients: { emailAddress: { name: string; address: string } }[];
    receivedDateTime: string;
    isRead: boolean;
    hasAttachments: boolean;
};

type MatchedContact = { id: string; first_name: string; last_name: string };

export default function EmailsPage() {
    const [connected, setConnected] = useState<boolean | null>(null);
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [matchedContacts, setMatchedContacts] = useState<Record<string, MatchedContact>>({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextSkip, setNextSkip] = useState(0);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [showCompose, setShowCompose] = useState(false);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const checkConnection = async () => {
        try {
            const res = await fetch("/api/integrations/outlook");
            const data = await res.json();
            setConnected(data.connected);
            return data.connected;
        } catch {
            setConnected(false);
            return false;
        }
    };

    const fetchEmails = useCallback(async (skip = 0, searchQuery = search) => {
        if (skip === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({ top: "25", skip: String(skip) });
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`/api/email/messages?${params}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch emails");
            }

            const data = await res.json();

            if (skip === 0) {
                setMessages(data.messages);
            } else {
                setMessages((prev) => [...prev, ...data.messages]);
            }

            setMatchedContacts((prev) => ({ ...prev, ...data.matchedContacts }));
            setHasMore(data.hasMore);
            setNextSkip(data.nextSkip);
        } catch (err: any) {
            toast.error(err.message || "Failed to fetch emails");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [search]);

    useEffect(() => {
        const init = async () => {
            const isConnected = await checkConnection();
            if (isConnected) {
                fetchEmails(0, "");
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSearch = () => {
        setSearch(searchInput);
        fetchEmails(0, searchInput);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const openEmail = (id: string) => {
        setSelectedEmailId(id);
        setSheetOpen(true);
        // Optimistically mark as read in the list
        setMessages((prev) => prev.map((msg) => msg.id === id ? { ...msg, isRead: true } : msg));
    };

    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    };

    // Not connected state
    if (connected === false) {
        return (
            <DashboardPage>
                <DashboardHeader title="Emails" subtitle="View and manage your Outlook inbox." />
                <div className="px-4 md:px-6 lg:px-10">
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                            <EnvelopeIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Connect your Outlook</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                            Connect your Microsoft Outlook account to view and send emails directly from the CRM.
                        </p>
                        <Button
                            className="rounded-full"
                            onClick={() => {
                                window.location.href = "/dashboard/settings/integrations";
                            }}
                        >
                            <LinkIcon className="w-4 h-4 mr-1.5" />
                            Go to Integrations
                        </Button>
                    </div>
                </div>
            </DashboardPage>
        );
    }

    return (
        <DashboardPage>
            <DashboardHeader title="Emails" subtitle="View and manage your Outlook inbox.">
                <Button size="sm" className="rounded-full" onClick={() => setShowCompose(true)}>
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    Compose
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search emails..."
                        className="pl-9 rounded-full"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => fetchEmails(0, search)}>
                    Refresh
                </Button>
            </DashboardControls>

            <div className="px-4 md:px-6 lg:px-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-sm text-muted-foreground">Loading emails...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <EnvelopeIcon className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {search ? "No emails match your search." : "Your inbox is empty."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={tableBase}>
                            <table className="w-full">
                                <thead>
                                    <tr className={tableHead}>
                                        <th className={cn(tableHeadCell, "w-8")} />
                                        <th className={cn(tableHeadCell, "min-w-[180px]")}>From</th>
                                        <th className={tableHeadCell}>Subject</th>
                                        <th className={cn(tableHeadCell, "w-28 text-right")}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {messages.map((msg) => {
                                        const senderEmail = msg.from?.emailAddress?.address?.toLowerCase() || "";
                                        const senderName = msg.from?.emailAddress?.name || senderEmail;
                                        const contact = matchedContacts[senderEmail];
                                        const initials = senderName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

                                        return (
                                            <tr
                                                key={msg.id}
                                                className={cn(tableRow, "cursor-pointer")}
                                                onClick={() => openEmail(msg.id)}
                                            >
                                                <td className={tableCell}>
                                                    {!msg.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                                    )}
                                                </td>
                                                <td className={tableCell}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={cn("text-sm truncate", !msg.isRead && "font-semibold")}>
                                                                {senderName}
                                                            </p>
                                                            {contact && (
                                                                <p className="text-[11px] text-blue-600 truncate">
                                                                    {contact.first_name} {contact.last_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={tableCell}>
                                                    <div className="min-w-0">
                                                        <p className={cn("text-sm truncate", !msg.isRead && "font-semibold")}>
                                                            {msg.subject || "(No subject)"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-md">
                                                            {msg.bodyPreview}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className={cn(tableCell, "text-right")}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        {msg.hasAttachments && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                                📎
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {timeAgo(msg.receivedDateTime)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {hasMore && (
                            <div className="flex justify-center pt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => fetchEmails(nextSkip, search)}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? "Loading..." : "Load more"}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ComposeEmailModal
                open={showCompose}
                onOpenChange={setShowCompose}
                onSent={() => fetchEmails(0, search)}
            />

            <EmailSideSheet
                emailId={selectedEmailId}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                matchedContacts={matchedContacts}
            />
        </DashboardPage>
    );
}
