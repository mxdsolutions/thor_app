"use client";

import { motion } from "framer-motion";
import { ArrowRight as ArrowRightIcon, ArrowLeft as ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inputClass, primaryBtnClass, ghostBtnClass, labelClass } from "./styles";

interface Props {
    firstName: string;
    setFirstName: (v: string) => void;
    lastName: string;
    setLastName: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    accountValid: boolean;
    onNext: () => void;
    onBack: () => void;
}

export function AccountStep({
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    password, setPassword,
    accountValid, onNext, onBack,
}: Props) {
    return (
        <motion.div
            key="account"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md space-y-8"
        >
            <div className="text-center space-y-3">
                <h2 className="font-statement text-4xl md:text-5xl text-white tracking-tight">
                    Create your account
                </h2>
                <p className="text-white/50 text-base">
                    You&apos;ll be the workspace owner.
                </p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className={labelClass}>First Name</label>
                        <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Jane"
                            className={inputClass}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={labelClass}>Last Name</label>
                        <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            className={inputClass}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>Email</label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={inputClass}
                        autoComplete="email"
                    />
                </div>
                <div className="space-y-2">
                    <label className={labelClass}>Password</label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className={inputClass}
                        autoComplete="new-password"
                        onKeyDown={(e) => e.key === "Enter" && accountValid && onNext()}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className={ghostBtnClass}>
                    <ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button size="lg" onClick={onNext} disabled={!accountValid} className={primaryBtnClass}>
                    Continue <ArrowRightIcon className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
}
