"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateServiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (service: { id: string; name: string }) => void;
}

export function CreateServiceModal({ open, onOpenChange, onCreated }: CreateServiceModalProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [initialValue, setInitialValue] = useState("");
    const [monthlyValue, setMonthlyValue] = useState("");
    const reset = () => {
        setName("");
        setDescription("");
        setInitialValue("");
        setMonthlyValue("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            const res = await fetch("/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    initial_value: initialValue ? parseFloat(initialValue) : 0,
                    monthly_value: monthlyValue ? parseFloat(monthlyValue) : 0,
                    yearly_value: monthlyValue ? parseFloat(monthlyValue) * 12 : 0,
                }),
            });
            if (!res.ok) throw new Error("Failed to create service");
            const data = await res.json();
            toast.success("Service created");
            onCreated?.(data.service);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create service");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Service</DialogTitle>
                    <DialogDescription>Add a service to your operations.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Service Name *</label>
                        <Input
                            autoFocus
                            placeholder="Website Package"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                        <Input
                            placeholder="Brief description of the service..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Initial Value</label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={initialValue}
                            onChange={(e) => setInitialValue(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Monthly Value</label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={monthlyValue}
                            onChange={(e) => setMonthlyValue(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || saving}>
                            {saving ? "Creating..." : "Create Service"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
