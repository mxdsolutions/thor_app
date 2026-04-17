import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX as XMarkIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { inviteUser } from "@/app/actions/inviteUser";

export function UserInviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<"admin" | "member">("member");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setEmail("");
            setFirstName("");
            setLastName("");
            setRole("member");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    if (!open) return null;

    const handleInvite = async () => {
        if (!email.trim() || !firstName.trim() || !lastName.trim()) return;
        setLoading(true);
        const res = await inviteUser(email.trim(), firstName.trim(), lastName.trim(), role);
        setLoading(false);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(`Invitation sent to ${email}`);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="relative z-10 bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold">Invite a team member</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            They&apos;ll receive an email with a link to join.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">First name</label>
                            <Input
                                ref={inputRef}
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Last name</label>
                            <Input
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email address</label>
                        <Input
                            type="email"
                            placeholder="colleague@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as "admin" | "member")}
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-xl"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 rounded-xl"
                            onClick={handleInvite}
                            disabled={loading || !email.trim() || !firstName.trim() || !lastName.trim()}
                        >
                            {loading ? "Sending..." : "Send Invitation"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
