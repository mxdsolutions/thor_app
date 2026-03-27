"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CreateLeadModal } from "./CreateLeadModal";
import { toast } from "sonner";

interface CreateOpportunityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (opportunity: any) => void;
}

type LeadOption = { id: string; title: string; company_id?: string | null };

export function CreateOpportunityModal({ open, onOpenChange, onCreated }: CreateOpportunityModalProps) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [probability, setProbability] = useState("50");
    const [expectedCloseDate, setExpectedCloseDate] = useState("");
    const [leadId, setLeadId] = useState("");
    const [leads, setLeads] = useState<LeadOption[]>([]);
    const [leadSearch, setLeadSearch] = useState("");
    const [showLeadDropdown, setShowLeadDropdown] = useState(false);
    const [showCreateLead, setShowCreateLead] = useState(false);

    useEffect(() => {
        if (open) {
            fetch("/api/leads")
                .then(r => r.json())
                .then(d => setLeads((d.leads || []).map((l: any) => ({ id: l.id, title: l.title, company_id: l.company_id }))))
                .catch(() => { });
        }
    }, [open]);

    const selectedLead = leads.find(l => l.id === leadId);
    const filteredLeads = leads.filter(l =>
        l.title.toLowerCase().includes(leadSearch.toLowerCase())
    );

    const reset = () => {
        setTitle("");
        setValue("");
        setProbability("50");
        setExpectedCloseDate("");
        setLeadId("");
        setLeadSearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setSaving(true);
        try {
            const lead = leads.find(l => l.id === leadId);
            const res = await fetch("/api/opportunities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    value: value ? parseFloat(value) : 0,
                    probability: probability ? parseInt(probability) : 0,
                    expected_close_date: expectedCloseDate || null,
                    lead_id: leadId || null,
                    company_id: lead?.company_id || null,
                    stage: "appt_booked",
                }),
            });
            if (!res.ok) throw new Error("Failed to create opportunity");
            const data = await res.json();
            toast.success("Opportunity created");
            onCreated?.(data.opportunity);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create opportunity");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Opportunity</DialogTitle>
                        <DialogDescription>Create a new deal in your pipeline.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Deal Title *</label>
                            <Input
                                autoFocus
                                placeholder="Website redesign for Acme"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Lead selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Related Lead</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search or create lead..."
                                    value={selectedLead ? selectedLead.title : leadSearch}
                                    onChange={(e) => {
                                        setLeadSearch(e.target.value);
                                        setLeadId("");
                                        setShowLeadDropdown(true);
                                    }}
                                    onFocus={() => setShowLeadDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowLeadDropdown(false), 200)}
                                    className="rounded-xl"
                                />
                                {showLeadDropdown && !selectedLead && (
                                    <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredLeads.map(l => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                                                onClick={() => {
                                                    setLeadId(l.id);
                                                    setLeadSearch("");
                                                    setShowLeadDropdown(false);
                                                }}
                                            >
                                                {l.title}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-1.5 border-t border-border"
                                            onClick={() => {
                                                setShowLeadDropdown(false);
                                                setShowCreateLead(true);
                                            }}
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            Create new lead{leadSearch ? `: "${leadSearch}"` : ""}
                                        </button>
                                    </div>
                                )}
                                {selectedLead && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => { setLeadId(""); setLeadSearch(""); }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Deal Value *</label>
                                <Input
                                    placeholder="25,000"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Probability %</label>
                                <Input
                                    placeholder="50"
                                    value={probability}
                                    onChange={(e) => setProbability(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Expected Close Date</label>
                            <Input
                                type="date"
                                value={expectedCloseDate}
                                onChange={(e) => setExpectedCloseDate(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!title.trim() || saving}>
                                {saving ? "Creating..." : "Create Opportunity"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <CreateLeadModal
                open={showCreateLead}
                onOpenChange={setShowCreateLead}
                onCreated={(lead) => {
                    setLeads(prev => [{ id: lead.id, title: lead.title, company_id: lead.company_id }, ...prev]);
                    setLeadId(lead.id);
                    setLeadSearch("");
                }}
            />
        </>
    );
}
