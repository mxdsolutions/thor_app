"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type MobileHeaderAction = (() => void) | null;
type MobileHeaderActionSetter = (action: MobileHeaderAction) => void;

// Split contexts: setter is stable, value re-renders only its consumer (the
// header button). Pages calling useMobileHeaderAction never re-render when
// the active action changes elsewhere.
const MobileHeaderActionValueContext = createContext<MobileHeaderAction>(null);
const MobileHeaderActionSetterContext = createContext<MobileHeaderActionSetter>(() => {});

export function MobileHeaderActionProvider({ children }: { children: React.ReactNode }) {
    const [action, setActionRaw] = useState<MobileHeaderAction>(null);
    // useState would treat a function value as an updater; wrap so callers can
    // pass the callback directly.
    const setAction = useCallback<MobileHeaderActionSetter>((fn) => {
        setActionRaw(() => fn);
    }, []);
    return (
        <MobileHeaderActionSetterContext.Provider value={setAction}>
            <MobileHeaderActionValueContext.Provider value={action}>
                {children}
            </MobileHeaderActionValueContext.Provider>
        </MobileHeaderActionSetterContext.Provider>
    );
}

/** Pages call this to register a create/add action that shows as a + button in the mobile header. */
export function useMobileHeaderAction(callback: () => void) {
    const setAction = useContext(MobileHeaderActionSetterContext);
    useEffect(() => {
        setAction(callback);
        return () => setAction(null);
    }, [callback, setAction]);
}

/** Shell uses this to read the current action. */
export function useMobileHeaderActionValue() {
    return useContext(MobileHeaderActionValueContext);
}
