"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (product: { id: string; name: string }) => void;
}

export function CreateProductModal({ open, onOpenChange, onCreated }: CreateProductModalProps) {
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
            const res = await fetch("/api/products", {
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
            if (!res.ok) throw new Error("Failed to create product");
            const data = await res.json();
            toast.success("Product created");
            onCreated?.(data.product);
            reset();
            onOpenChange(false);
        } catch {
            toast.error("Failed to create product");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Product</DialogTitle>
                    <DialogDescription>Add a product to your operations.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
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
                            placeholder="Brief description of the product..."
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
                            {saving ? "Creating..." : "Create Product"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
