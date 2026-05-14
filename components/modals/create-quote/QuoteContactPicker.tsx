"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus as PlusIcon } from "lucide-react";
import type { ContactOption } from "./types";

interface Props {
    contacts: ContactOption[];
    contactId: string;
    setContactId: (id: string) => void;
    setCompanyId: (id: string) => void;
    onRequestCreate: () => void;
}

export function QuoteContactPicker({ contacts, contactId, setContactId, setCompanyId, onRequestCreate }: Props) {
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const selected = contacts.find((c) => c.id === contactId);
    const filtered = contacts.filter((c) => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(search.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    });

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Contact</label>
            <div className="relative">
                <Input
                    placeholder="Search or create contact..."
                    value={selected ? `${selected.first_name} ${selected.last_name}` : search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setContactId("");
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="rounded-xl"
                />
                {showDropdown && !selected && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filtered.length === 0 && !search && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Type to search contacts</div>
                        )}
                        {filtered.length === 0 && search && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                        )}
                        {filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl"
                                onClick={() => {
                                    setContactId(c.id);
                                    setSearch("");
                                    setShowDropdown(false);
                                    if (c.company_id) setCompanyId(c.company_id);
                                }}
                            >
                                <span className="font-medium">{c.first_name} {c.last_name}</span>
                                {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border rounded-b-xl"
                            onClick={() => {
                                setShowDropdown(false);
                                onRequestCreate();
                            }}
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Create new contact{search ? `: "${search}"` : ""}
                        </button>
                    </div>
                )}
                {selected && (
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => { setContactId(""); setSearch(""); setCompanyId(""); }}
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
