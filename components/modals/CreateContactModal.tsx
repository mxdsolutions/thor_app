"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { toast } from "sonner";

interface CreateContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (contact: { id: string; first_name: string; last_name: string; company_id?: string }) => void;
    defaultCompanyId?: string;
}

type CompanyOption = { id: string; name: string };

export function CreateContactModal({ open, onOpenChange, onCreated, defaultCompanyId }: CreateContactModalProps) {
    const [saving, setSaving] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [companyId, setCompanyId] = useState(defaultCompanyId || "");
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [companySearch, setCompanySearch] = useState("");
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [showCreateCompany, setShowCreateCompany] = useState(false);

    useEffect(() => {
        if (open) {
            fetch("/api/companies")
                .then(r => r.json())
                .then(d => setCompanies(d.companies || []))
                .catch(() => { });
        }
    }, [open]);

    useEffect(() => {
        if (defaultCompanyId) setCompanyId(defaultCompanyId);
    }, [defaultCompanyId]);

    const selectedCompany = companies.find(c => c.id === companyId);
    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const reset = () => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setJobTitle("");
        setCompanyId(defaultCompanyId || "");
        setCompanySearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) return;

        setSaving(true);
        try {
            const res = await fetch("/api/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    job_title: jobTitle.trim() || null,
                    company_id: companyId || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to create contact");
            const data = await res.json();
            toast.success("Contact created");
            onCreated?.(data.contact);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create contact");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Contact</DialogTitle>
                        <DialogDescription>Add a person to your contacts.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                                <Input
                                    autoFocus
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                                <Input
                                    placeholder="Smith"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Email</label>
                                <Input
                                    placeholder="john@acme.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                                <Input
                                    placeholder="0400 000 000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Job Title</label>
                            <Input
                                placeholder="Project Manager"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Company selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Company</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search or create company..."
                                    value={selectedCompany ? selectedCompany.name : companySearch}
                                    onChange={(e) => {
                                        setCompanySearch(e.target.value);
                                        setCompanyId("");
                                        setShowCompanyDropdown(true);
                                    }}
                                    onFocus={() => setShowCompanyDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                                    className="rounded-xl"
                                />
                                {showCompanyDropdown && !selectedCompany && (
                                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredCompanies.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                                                onClick={() => {
                                                    setCompanyId(c.id);
                                                    setCompanySearch("");
                                                    setShowCompanyDropdown(false);
                                                }}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border"
                                            onClick={() => {
                                                setShowCompanyDropdown(false);
                                                setShowCreateCompany(true);
                                            }}
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            Create new company{companySearch ? `: "${companySearch}"` : ""}
                                        </button>
                                    </div>
                                )}
                                {selectedCompany && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => { setCompanyId(""); setCompanySearch(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!firstName.trim() || !lastName.trim() || saving}>
                                {saving ? "Creating..." : "Create Contact"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
        </Dialog>

            {showCreateCompany && (
                <CreateCompanyModal
                    open={showCreateCompany}
                    onOpenChange={setShowCreateCompany}
                    onCreated={(company) => {
                        setCompanies(prev => [company, ...prev]);
                        setCompanyId(company.id);
                        setCompanySearch("");
                    }}
                />
            )}
        </>
    );
}
