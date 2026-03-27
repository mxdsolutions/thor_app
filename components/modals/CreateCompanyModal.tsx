"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateCompanyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (company: { id: string; name: string }) => void;
}

export function CreateCompanyModal({ open, onOpenChange, onCreated }: CreateCompanyModalProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [industry, setIndustry] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    const reset = () => {
        setName("");
        setIndustry("");
        setPhone("");
        setEmail("");
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
                    industry: industry.trim() || null,
                    phone: phone.trim() || null,
                    email: email.trim() || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to create company");
            const data = await res.json();
            toast.success("Company created");
            onCreated?.(data.company);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create company");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Company</DialogTitle>
                    <DialogDescription>Add a company to your CRM.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                        <Input
                            autoFocus
                            placeholder="Acme Corp"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Industry</label>
                        <Input
                            placeholder="Construction, Technology..."
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Phone</label>
                            <Input
                                placeholder="0400 000 000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                            <Input
                                placeholder="info@acme.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || saving}>
                            {saving ? "Creating..." : "Create Company"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
