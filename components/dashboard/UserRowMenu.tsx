"use client";

import { useState } from "react";
import { MoreVertical, RefreshCw, KeyRound, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type UserRowMenuProps = {
    /** True for users with a tenant_invites row but no membership yet. */
    isPending: boolean;
    /** True when last_sign_in_at is set on auth.users. */
    hasSignedIn: boolean;
    onResend: () => void;
    onRevoke: () => void;
    onPasswordReset: () => void;
};

const itemClass =
    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-secondary transition-colors";

export function UserRowMenu({
    isPending,
    hasSignedIn,
    onResend,
    onRevoke,
    onPasswordReset,
}: UserRowMenuProps) {
    const [open, setOpen] = useState(false);

    const showResend = isPending || !hasSignedIn;
    const showRevoke = isPending || !hasSignedIn;
    const showPasswordReset = hasSignedIn;
    const hasAny = showResend || showRevoke || showPasswordReset;

    if (!hasAny) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Row actions"
                >
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-52 p-1"
                onClick={(e) => e.stopPropagation()}
            >
                {showResend && (
                    <button
                        type="button"
                        onClick={() => { setOpen(false); onResend(); }}
                        className={`${itemClass} text-foreground`}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Resend invitation
                    </button>
                )}
                {showPasswordReset && (
                    <button
                        type="button"
                        onClick={() => { setOpen(false); onPasswordReset(); }}
                        className={`${itemClass} text-foreground`}
                    >
                        <KeyRound className="w-4 h-4" />
                        Send password reset
                    </button>
                )}
                {showRevoke && (
                    <button
                        type="button"
                        onClick={() => { setOpen(false); onRevoke(); }}
                        className={`${itemClass} text-rose-600`}
                    >
                        <UserMinus className="w-4 h-4" />
                        Revoke invitation
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
}
