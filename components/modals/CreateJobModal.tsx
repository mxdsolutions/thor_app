"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX as XMarkIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { useContacts, useProfiles, useStatusConfig } from "@/lib/swr";
import { DEFAULT_JOB_STATUSES, getDefaultStatusId } from "@/lib/status-config";
import { mutate } from "swr";

const CreateContactModal = lazy(() =>
    import("./CreateContactModal").then(mod => ({ default: mod.CreateContactModal }))
);

interface CreateJobModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (job: Record<string, unknown>) => void;
    defaultValues?: { contactId?: string; description?: string };
}

type Contact = { id: string; first_name: string; last_name: string; email: string | null; company_id: string | null };
type User = { id: string; full_name: string | null; email: string | null };

/** Modal for creating a new service job with contact search, auto-populated title, and assignee selection. */
export function CreateJobModal({ open, onOpenChange, onCreated, defaultValues }: CreateJobModalProps) {
    const [saving, setSaving] = useState(false);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

    // Contact search
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);

    const { data: statusData } = useStatusConfig("job");
    const defaultStatus = getDefaultStatusId(statusData?.statuses ?? DEFAULT_JOB_STATUSES);
    const { data: contactData } = useContacts();
    const contacts: Contact[] = contactData?.items || [];

    const { data: userData } = useProfiles();
    const users: User[] = userData?.users || [];

    const selectedContact = contacts.find(c => c.id === contactId);
    const filteredContacts = contacts.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(contactSearch.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()));
    });

    const reset = () => {
        setDescription("");
        setAmount("");
        setContactId("");
        setContactSearch("");
        setAssigneeIds([]);
    };

    useEffect(() => {
        if (!open) {
            reset();
        } else if (defaultValues) {
            if (defaultValues.contactId) setContactId(defaultValues.contactId);
            if (defaultValues.description) setDescription(defaultValues.description);
        }
    }, [open]);

    // Auto-populate description from contact name
    const handleSelectContact = (contact: Contact) => {
        setContactId(contact.id);
        setContactSearch("");
        setShowContactDropdown(false);
        const contactName = `${contact.first_name} ${contact.last_name}`.trim();
        if (!description.trim()) {
            setDescription(contactName);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) { toast.error("Job description is required"); return; }
        if (!contactId) { toast.error("Contact is required"); return; }

        setSaving(true);
        try {
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description.trim(),
                    amount: amount ? parseFloat(amount) : 0,
                    company_id: selectedContact?.company_id || null,
                    assignee_ids: assigneeIds,
                    status: defaultStatus,
                }),
            });
            if (!res.ok) throw new Error("Failed to create job");
            const data = await res.json();
            toast.success("Job created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create job");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Job</DialogTitle>
                        <DialogDescription>Create a new service job.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Contact selector with search + create */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Contact *</label>
                            <div className="relative">
                                <Input
                                    autoFocus
                                    placeholder="Search or create contact..."
                                    value={selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : contactSearch}
                                    onChange={(e) => {
                                        setContactSearch(e.target.value);
                                        setContactId("");
                                        setShowContactDropdown(true);
                                    }}
                                    onFocus={() => setShowContactDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                                    className="rounded-xl"
                                />
                                {showContactDropdown && !selectedContact && (
                                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredContacts.length === 0 && !contactSearch && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Type to search contacts</div>
                                        )}
                                        {filteredContacts.length === 0 && contactSearch && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                                        )}
                                        {filteredContacts.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl"
                                                onClick={() => handleSelectContact(c)}
                                            >
                                                <span className="font-medium">{c.first_name} {c.last_name}</span>
                                                {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border rounded-b-xl"
                                            onClick={() => {
                                                setShowContactDropdown(false);
                                                setShowCreateContact(true);
                                            }}
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            Create new contact{contactSearch ? `: "${contactSearch}"` : ""}
                                        </button>
                                    </div>
                                )}
                                {selectedContact && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => { setContactId(""); setContactSearch(""); setDescription(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Job Title *</label>
                            <Input
                                placeholder="Auto-filled from contact name"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Cost</label>
                            <Input
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Multi-assignee */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Assignees</label>
                            {assigneeIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                    {assigneeIds.map((uid) => {
                                        const u = users.find(u => u.id === uid);
                                        return (
                                            <span key={uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs font-medium">
                                                {u?.full_name || u?.email || uid}
                                                <button
                                                    type="button"
                                                    onClick={() => setAssigneeIds(prev => prev.filter(id => id !== uid))}
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value && !assigneeIds.includes(e.target.value)) {
                                        setAssigneeIds(prev => [...prev, e.target.value]);
                                    }
                                }}
                                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">Add assignee...</option>
                                {users.filter(u => !assigneeIds.includes(u.id)).map((u) => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!description.trim() || !contactId || saving}>
                                {saving ? "Creating..." : "Create Job"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {showCreateContact && (
                <Suspense fallback={null}>
                    <CreateContactModal
                        open={showCreateContact}
                        onOpenChange={setShowCreateContact}
                        onCreated={(contact) => {
                            mutate("/api/contacts");
                            handleSelectContact(contact as Contact);
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
