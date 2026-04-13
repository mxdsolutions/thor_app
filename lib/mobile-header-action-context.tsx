"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface MobileHeaderActionContextValue {
    action: (() => void) | null;
    setAction: (action: (() => void) | null) => void;
}

const MobileHeaderActionContext = createContext<MobileHeaderActionContextValue>({
    action: null,
    setAction: () => {},
});

export function MobileHeaderActionProvider({ children }: { children: React.ReactNode }) {
    const [action, setActionRaw] = useState<(() => void) | null>(null);
    // Wrap in useCallback to avoid React treating functions as state updaters
    const setAction = useCallback((fn: (() => void) | null) => {
        setActionRaw(() => fn);
    }, []);
    return (
        <MobileHeaderActionContext.Provider value={{ action, setAction }}>
            {children}
        </MobileHeaderActionContext.Provider>
    );
}

/** Pages call this to register a create/add action that shows as a + button in the mobile header. */
export function useMobileHeaderAction(callback: () => void) {
    const { setAction } = useContext(MobileHeaderActionContext);
    useEffect(() => {
        setAction(callback);
        return () => setAction(null);
    }, [callback, setAction]);
}

/** Shell uses this to read the current action. */
export function useMobileHeaderActionValue() {
    return useContext(MobileHeaderActionContext).action;
}
