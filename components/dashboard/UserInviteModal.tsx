import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX as XMarkIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { inviteUser } from "@/app/actions/inviteUser";
import { useTenantSubscription } from "@/lib/swr";

export function UserInviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<"admin" | "member">("member");
    const inputRef = useRef<HTMLInputElement>(null);
    const { data: subData, mutate: mutateSub } = useTenantSubscription();
    const { mutate: mutateGlobal } = useSWRConfig();

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

    // null in `usage.available` means unlimited (billing-exempt). 0 means
    // capped and full — block invites and route to the subscription page.
    // Only block on confirmed state (subData loaded). If subData is undefined
    // — endpoint failed or still loading — let the user click; the server
    // action's claim_seat RPC is the real authority and will reject if
    // there's actually no quota. Otherwise a transient endpoint failure
    // silently blocks billing-exempt tenants who should always be allowed.
    const available = subData?.usage.available;
    const noSubscription = subData != null && subData.subscription == null && !subData.billing_exempt;
    const seatsFull = subData != null && !subData.billing_exempt && available === 0;
    const blocked = noSubscription || seatsFull;

    const handleInvite = () => {
        if (!email.trim() || !firstName.trim() || !lastName.trim()) return;

        // Capture form values before closing — the open-effect clears state.
        const captured = {
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role,
        };

        // Optimistic close. Supabase Auth → Resend SMTP send takes 2–4s
        // because it's synchronous; toast.promise gives the user immediate
        // feedback and keeps them productive while the request runs in the
        // background. If it fails, the toast surfaces the error and they
        // can re-open the modal to retry.
        onClose();

        toast.promise(
            (async () => {
                const res = await inviteUser(
                    captured.email,
                    captured.firstName,
                    captured.lastName,
                    captured.role,
                );
                if (!res.success) throw new Error(res.error);
                // The new pending invite consumes a seat — refresh the usage
                // line — and shows up as an "Invited" row in the users list.
                mutateSub();
                mutateGlobal("/api/users");
                return res;
            })(),
            {
                loading: `Sending invitation to ${captured.email}…`,
                success: `Invitation sent to ${captured.email}`,
                error: (err) =>
                    err instanceof Error ? err.message : "Failed to send invitation",
            },
        );
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

                    {blocked && (
                        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                            {noSubscription ? (
                                <>
                                    <p className="font-medium text-foreground">Subscribe to invite teammates.</p>
                                    <p className="text-muted-foreground mt-0.5">
                                        Pick a plan in{" "}
                                        <Link
                                            href="/dashboard/settings/company/subscription"
                                            className="underline underline-offset-4"
                                            onClick={onClose}
                                        >
                                            Settings → Subscription
                                        </Link>
                                        {" "}before sending invites.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-foreground">All seats are in use.</p>
                                    <p className="text-muted-foreground mt-0.5">
                                        <Link
                                            href="/dashboard/settings/company/subscription"
                                            className="underline underline-offset-4"
                                            onClick={onClose}
                                        >
                                            Add a seat
                                        </Link>
                                        {" "}before inviting another teammate.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {!blocked && available != null && (
                        <p className="text-xs text-muted-foreground">
                            {available === 1
                                ? "1 seat available."
                                : `${available} seats available.`}
                        </p>
                    )}

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
                            disabled={
                                blocked ||
                                !email.trim() ||
                                !firstName.trim() ||
                                !lastName.trim()
                            }
                        >
                            Send Invitation
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
