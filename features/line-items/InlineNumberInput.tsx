"use client";

import { useState } from "react";

interface InlineNumberInputProps {
    value: number;
    onSave: (v: number) => void;
    prefix?: string;
}

export function InlineNumberInput({ value, onSave, prefix }: InlineNumberInputProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));

    if (editing) {
        return (
            <input
                type="number"
                min={0}
                step={prefix ? 0.01 : 1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                    setEditing(false);
                    const parsed = Number(draft);
                    if (!isNaN(parsed) && parsed !== value) onSave(parsed);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setEditing(false); setDraft(String(value)); }
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-sm tabular-nums hover:underline cursor-pointer text-right w-full"
        >
            {prefix}{value.toLocaleString()}
        </button>
    );
}
