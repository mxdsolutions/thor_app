"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX as XMarkIcon, IconPlus as PlusIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { useContacts, useProfiles, useStatusConfig, useServices } from "@/lib/swr";
import { DEFAULT_JOB_STATUSES, getDefaultStatusId } from "@/lib/status-config";
import { useTenant } from "@/lib/tenant-context";
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
type Service = { id: string; name: string };

/** Modal for creating a new service job with type, contact, auto job-id, and assignees. */
export function CreateJobModal({ open, onOpenChange, onCreated, defaultValues }: CreateJobModalProps) {
    const [saving, setSaving] = useState(false);
    const [referenceId, setReferenceId] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

    // Type (service) search
    const [serviceId, setServiceId] = useState("");
    const [serviceSearch, setServiceSearch] = useState("");
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [creatingService, setCreatingService] = useState(false);

    // Contact search
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);

    const tenant = useTenant();
    const prefix = tenant.reference_prefix?.trim() || "";
    const { data: statusData } = useStatusConfig("job");
    const defaultStatus = getDefaultStatusId(statusData?.statuses ?? DEFAULT_JOB_STATUSES);
    const { data: contactData } = useContacts();
    const contacts: Contact[] = contactData?.items || [];

    const { data: userData } = useProfiles();
    const users: User[] = userData?.users || [];

    const { data: serviceData, mutate: refreshServices } = useServices();
    const services: Service[] = serviceData?.items || [];

    const selectedContact = contacts.find(c => c.id === contactId);
    const filteredContacts = contacts.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(contactSearch.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()));
    });

    const selectedService = services.find(s => s.id === serviceId);
    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );

    const reset = () => {
        setReferenceId("");
        setJobTitle("");
        setDescription("");
        setContactId("");
        setContactSearch("");
        setServiceId("");
        setServiceSearch("");
        setAssigneeIds([]);
    };

    useEffect(() => {
        if (!open) {
            reset();
        } else if (defaultValues) {
            if (defaultValues.contactId) setContactId(defaultValues.contactId);
            if (defaultValues.description) setJobTitle(defaultValues.description);
        }
        // Intentionally only react to open/close. `defaultValues` is consumed
        // once at open time; treating it as a dep would re-apply defaults on
        // every parent render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSelectService = (service: Service) => {
        setServiceId(service.id);
        setServiceSearch("");
        setShowServiceDropdown(false);
        if (!jobTitle.trim()) {
            setJobTitle(service.name);
        }
    };

    const handleCreateService = async () => {
        const name = serviceSearch.trim();
        if (!name || creatingService) return;
        setCreatingService(true);
        try {
            const res = await fetch("/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            await refreshServices();
            handleSelectService(data.item as Service);
            toast.success("Service created");
        } catch {
            toast.error("Failed to create service");
        } finally {
            setCreatingService(false);
        }
    };

    const handleSelectContact = (contact: Contact) => {
        setContactId(contact.id);
        setContactSearch("");
        setShowContactDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobTitle.trim()) { toast.error("Job name is required"); return; }
        if (!contactId) { toast.error("Contact is required"); return; }

        const trimmedRef = referenceId.trim();
        const fullRef = trimmedRef
            ? (prefix ? `${prefix}-${trimmedRef}` : trimmedRef)
            : null;

        setSaving(true);
        try {
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference_id: fullRef,
                    job_title: jobTitle.trim(),
                    description: description.trim() || null,
                    service_id: serviceId || null,
                    contact_id: contactId || null,
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
                        {/* Job ID */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Job ID</label>
                            {prefix ? (
                                <div className="flex items-stretch rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                                    <span className="flex items-center px-3 text-sm font-mono font-semibold text-muted-foreground bg-secondary/60 border-r border-input select-none">
                                        {prefix}-
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated"
                                        value={referenceId}
                                        onChange={(e) => setReferenceId(e.target.value)}
                                        className="flex-1 h-9 px-3 text-sm bg-transparent outline-none"
                                    />
                                </div>
                            ) : (
                                <Input
                                    placeholder="Auto-generated"
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    className="rounded-xl"
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                This will be auto-populated if left empty.
                            </p>
                        </div>

                        {/* Type (service) selector with search + create */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search or create service type..."
                                    value={selectedService ? selectedService.name : serviceSearch}
                                    onChange={(e) => {
                                        setServiceSearch(e.target.value);
                                        setServiceId("");
                                        setShowServiceDropdown(true);
                                    }}
                                    onFocus={() => setShowServiceDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                                    className="rounded-xl"
                                />
                                {showServiceDropdown && !selectedService && (
                                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredServices.length === 0 && !serviceSearch && (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Type to search services</div>
                                        )}
                                        {filteredServices.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl"
                                                onClick={() => handleSelectService(s)}
                                            >
                                                <span className="font-medium">{s.name}</span>
                                            </button>
                                        ))}
                                        {serviceSearch.trim() && (
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border rounded-b-xl disabled:opacity-50"
                                                disabled={creatingService}
                                                onClick={handleCreateService}
                                            >
                                                <PlusIcon className="w-3.5 h-3.5" />
                                                {creatingService ? "Creating..." : `Create new service: "${serviceSearch}"`}
                                            </button>
                                        )}
                                    </div>
                                )}
                                {selectedService && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => { setServiceId(""); setServiceSearch(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Contact selector with search + create */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Contact *</label>
                            <div className="relative">
                                <Input
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
                                        onClick={() => { setContactId(""); setContactSearch(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Job Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Job Name *</label>
                            <Input
                                placeholder="Auto-filled from type"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                className="rounded-xl"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <textarea
                                placeholder="What does this job entail?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
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
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            <Button type="submit" disabled={!jobTitle.trim() || !contactId || saving}>
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
