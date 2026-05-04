"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type AssistantContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (window.matchMedia("(min-width: 768px)").matches) {
            setOpen(true);
        }
    }, []);

    const toggle = useCallback(() => setOpen((v) => !v), []);
    return (
        <AssistantContext.Provider value={{ open, setOpen, toggle }}>
            {children}
        </AssistantContext.Provider>
    );
}

export function useAssistant(): AssistantContextValue {
    const ctx = useContext(AssistantContext);
    if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
    return ctx;
}
