"use client";

import { motion } from "framer-motion";
import {
    IconArrowRight as ArrowRightIcon,
    IconPlus as PlusIcon,
    IconTrash as TrashIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inputClass, primaryBtnClass, ghostBtnClass } from "./styles";

type InviteRow = { email: string };

interface Props {
    invites: InviteRow[];
    setInvites: (rows: InviteRow[]) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    onSkip: () => void;
}

export function InvitesStep({ invites, setInvites, isSubmitting, onSubmit, onSkip }: Props) {
    return (
        <motion.div
            key="invite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md space-y-8"
        >
            <div className="text-center space-y-3">
                <h2 className="font-statement text-4xl md:text-5xl text-white tracking-tight">
                    Invite your team
                </h2>
                <p className="text-white/50 text-base">
                    Add who you want to bring on board. We&apos;ll size your subscription to match in the next step.
                </p>
            </div>

            <div className="space-y-3">
                {invites.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <Input
                            type="email"
                            value={row.email}
                            onChange={(e) => {
                                const next = [...invites];
                                next[idx] = { email: e.target.value };
                                setInvites(next);
                            }}
                            placeholder="teammate@company.com"
                            className={inputClass}
                            autoFocus={idx === 0}
                        />
                        {invites.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setInvites(invites.filter((_, i) => i !== idx))}
                                className="text-white/30 hover:text-white/70 transition-colors p-2"
                                aria-label="Remove invite"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => setInvites([...invites, { email: "" }])}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                    <PlusIcon className="w-4 h-4" /> Add another
                </button>
            </div>

            <p className="text-xs text-white/30 text-center">
                Everyone joins as <span className="text-white/60">Member</span>. You can change roles later in Settings → Users.
            </p>

            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onSkip} disabled={isSubmitting} className={ghostBtnClass}>
                    Skip for now
                </Button>
                <Button size="lg" onClick={onSubmit} disabled={isSubmitting} className={primaryBtnClass}>
                    {isSubmitting ? "Sending..." : "Send invites"}
                    {!isSubmitting && <ArrowRightIcon className="ml-2 w-4 h-4" />}
                </Button>
            </div>
        </motion.div>
    );
}
