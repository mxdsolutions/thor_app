"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLicenses } from "@/lib/swr";
import { IconPlus as PlusIcon, IconEdit as PencilSquareIcon, IconTrash as TrashIcon } from "@tabler/icons-react";
import { tableBase, tableHead, tableHeadCell, tableRow, tableCell, sectionHeadingClass } from "@/lib/design-system";

type License = {
    id: string;
    name: string;
    license_number: string;
    issuing_authority: string | null;
    expiry_date: string | null;
    status: "active" | "expired" | "suspended";
    created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    expired: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    suspended: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
};

const EMPTY_FORM: { name: string; license_number: string; issuing_authority: string; expiry_date: string; status: "active" | "expired" | "suspended" } = { name: "", license_number: "", issuing_authority: "", expiry_date: "", status: "active" };

export default function LicensesPage() {
    const { data, mutate } = useLicenses();
    const licenses: License[] = data?.items ?? [];
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (license: License) => {
        setForm({
            name: license.name,
            license_number: license.license_number,
            issuing_authority: license.issuing_authority || "",
            expiry_date: license.expiry_date || "",
            status: license.status,
        });
        setEditingId(license.id);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.license_number.trim()) {
            toast.error("Name and license number are required");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...(editingId ? { id: editingId } : {}),
                name: form.name,
                license_number: form.license_number,
                issuing_authority: form.issuing_authority || null,
                expiry_date: form.expiry_date || null,
                status: form.status,
            };

            const res = await fetch("/api/licenses", {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error();
            toast.success(editingId ? "License updated" : "License added");
            resetForm();
            mutate();
        } catch {
            toast.error("Failed to save license");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/licenses?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("License removed");
            mutate();
        } catch {
            toast.error("Failed to delete license");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {!showForm && (
                <div className="flex justify-end">
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add License
                    </button>
                </div>
            )}

            {/* Add / Edit Form */}
            {showForm && (
                <div className="border border-border rounded-2xl p-5 bg-card shadow-sm space-y-4">
                    <h3 className={sectionHeadingClass}>
                        {editingId ? "Edit License" : "New License"}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                                placeholder="e.g. Builder's License"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">License Number</label>
                            <input
                                type="text"
                                value={form.license_number}
                                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                                placeholder="e.g. 12345C"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Issuing Authority</label>
                            <input
                                type="text"
                                value={form.issuing_authority}
                                onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                                placeholder="e.g. NSW Fair Trading"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
                            <input
                                type="date"
                                value={form.expiry_date}
                                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "expired" | "suspended" })}
                            className="w-48 px-4 py-2.5 border border-border rounded-xl text-sm bg-background"
                        >
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-5 py-2 bg-foreground text-background font-medium text-sm rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editingId ? "Update" : "Add License"}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-5 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Licenses Table */}
            {licenses.length === 0 && !showForm ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center">
                    <p className="text-sm text-muted-foreground">No licenses added yet.</p>
                </div>
            ) : (
                <div className="border border-border rounded-2xl overflow-hidden">
                    <table className={tableBase}>
                        <thead className={tableHead}>
                            <tr>
                                <th className={`${tableHeadCell} pl-5`}>Name</th>
                                <th className={tableHeadCell}>License Number</th>
                                <th className={tableHeadCell}>Issuing Authority</th>
                                <th className={tableHeadCell}>Expiry</th>
                                <th className={tableHeadCell}>Status</th>
                                <th className={`${tableHeadCell} pr-5 text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {licenses.map((license) => (
                                <tr key={license.id} className={tableRow}>
                                    <td className={`${tableCell} pl-5 font-medium`}>{license.name}</td>
                                    <td className={tableCell}>{license.license_number}</td>
                                    <td className={`${tableCell} text-muted-foreground`}>{license.issuing_authority || "—"}</td>
                                    <td className={`${tableCell} text-muted-foreground`}>
                                        {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : "—"}
                                    </td>
                                    <td className={tableCell}>
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[license.status]}`}>
                                            {license.status}
                                        </span>
                                    </td>
                                    <td className={`${tableCell} pr-5`}>
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => startEdit(license)}
                                                className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                                title="Edit"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(license.id)}
                                                disabled={deletingId === license.id}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-600"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
