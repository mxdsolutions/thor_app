"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { toast } from "sonner";

interface CreateLeadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (lead: any) => void;
}

type CompanyOption = { id: string; name: string };

export function CreateLeadModal({ open, onOpenChange, onCreated }: CreateLeadModalProps) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [estimatedValue, setEstimatedValue] = useState("");
    const [source, setSource] = useState("");
    const [priority, setPriority] = useState("medium");
    const [companyId, setCompanyId] = useState("");
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

    const selectedCompany = companies.find(c => c.id === companyId);
    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const reset = () => {
        setTitle("");
        setEstimatedValue("");
        setSource("");
        setPriority("medium");
        setCompanyId("");
        setCompanySearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setSaving(true);
        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
                    source: source.trim() || null,
                    priority,
                    company_id: companyId || null,
                    status: "new",
                }),
            });
            if (!res.ok) throw new Error("Failed to create lead");
            const data = await res.json();
            toast.success("Lead created");
            onCreated?.(data.lead);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create lead");
        } finally {
            setSaving(false);
        }
    };

    const priorities = [
        { value: "low", label: "Low", dot: "bg-slate-300" },
        { value: "medium", label: "Med", dot: "bg-amber-400" },
        { value: "high", label: "High", dot: "bg-rose-500" },
    ];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Lead</DialogTitle>
                        <DialogDescription>Capture a new sales lead.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Lead Title *</label>
                            <Input
                                autoFocus
                                placeholder="Website redesign project"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Company selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Company *</label>
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Estimated Value</label>
                                <Input
                                    placeholder="10,000"
                                    value={estimatedValue}
                                    onChange={(e) => setEstimatedValue(e.target.value.replace(/[^0-9.]/g, ""))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Source</label>
                                <Input
                                    placeholder="Referral, Website..."
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Priority</label>
                            <div className="flex gap-2">
                                {priorities.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setPriority(p.value)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${priority === p.value
                                            ? "border-foreground bg-foreground text-background"
                                            : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${priority === p.value ? "bg-background" : p.dot}`} />
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!title.trim() || saving}>
                                {saving ? "Creating..." : "Create Lead"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <CreateCompanyModal
                open={showCreateCompany}
                onOpenChange={setShowCreateCompany}
                onCreated={(company) => {
                    setCompanies(prev => [company, ...prev]);
                    setCompanyId(company.id);
                    setCompanySearch("");
                }}
            />
        </>
    );
}
