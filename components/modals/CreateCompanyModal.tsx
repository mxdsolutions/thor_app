"use client";

import { useState, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus as PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useContactOptions } from "@/lib/swr";

const CreateContactModal = lazy(() =>
    import("./CreateContactModal").then(mod => ({ default: mod.CreateContactModal }))
);

interface CreateCompanyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (company: { id: string; name: string }) => void;
}

type ContactOption = { id: string; first_name: string; last_name: string };

/** Modal for creating a new company with optional contact linking. */
export function CreateCompanyModal({ open, onOpenChange, onCreated }: CreateCompanyModalProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [isSupplier, setIsSupplier] = useState(false);
    const [contactId, setContactId] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [showCreateContact, setShowCreateContact] = useState(false);

    const { data: contactData, mutate: refreshContacts } = useContactOptions(open);
    const contacts: ContactOption[] = contactData?.items || [];

    const selectedContact = contacts.find(c => c.id === contactId);
    const filteredContacts = contacts.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const reset = () => {
        setName("");
        setWebsite("");
        setIsSupplier(false);
        setContactId("");
        setContactSearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            const res = await fetch("/api/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    website: website.trim() || null,
                    is_supplier: isSupplier,
                }),
            });
            if (!res.ok) throw new Error("Failed to create company");
            const data = await res.json();
            const companyId = data.item?.id;

            // Link the selected contact to this company
            if (companyId && contactId) {
                await fetch("/api/contacts", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: contactId,
                        company_id: companyId,
                    }),
                });
            }

            toast.success("Company created");
            onCreated?.(data.item);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create company");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Company</DialogTitle>
                        <DialogDescription>Add a company to your CRM.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <DialogBody className="space-y-4 pb-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Company Name *</label>
                            <Input
                                autoFocus
                                placeholder="Acme Corp"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Website</label>
                            <Input
                                placeholder="https://acme.com"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Supplier flag — drives the supplier picker on purchase orders */}
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <Checkbox
                                checked={isSupplier}
                                onCheckedChange={(v) => setIsSupplier(v === true)}
                            />
                            <span className="text-sm font-medium">Is a supplier</span>
                            <span className="text-xs text-muted-foreground">
                                — show this company when picking a vendor on POs
                            </span>
                        </label>

                        {/* Contact selector */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Contact</label>
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
                                        {filteredContacts.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                                                onClick={() => {
                                                    setContactId(c.id);
                                                    setContactSearch("");
                                                    setShowContactDropdown(false);
                                                }}
                                            >
                                                {c.first_name} {c.last_name}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border"
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

                        </DialogBody>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!name.trim() || saving}>
                                {saving ? "Creating..." : "Create Company"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {showCreateContact && (
                <Suspense fallback={null}>
                    <CreateContactModal
                        open={showCreateContact}
                        onOpenChange={setShowCreateContact}
                        onCreated={(contact) => {
                            refreshContacts();
                            setContactId(contact.id);
                            setContactSearch("");
                        }}
                    />
                </Suspense>
            )}
        </>
    );
}
