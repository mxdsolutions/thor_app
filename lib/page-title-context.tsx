"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Two contexts so consumers that only need to set the title don't re-render
// when the title changes, and consumers that only read the title don't re-render
// when an unrelated provider state changes. React's useState setter is already
// stable, so PageTitleSetterContext effectively never changes after mount.
const PageTitleValueContext = createContext<string>("");
const PageTitleSetterContext = createContext<Dispatch<SetStateAction<string>>>(() => {});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitle] = useState("");
    return (
        <PageTitleSetterContext.Provider value={setTitle}>
            <PageTitleValueContext.Provider value={title}>
                {children}
            </PageTitleValueContext.Provider>
        </PageTitleSetterContext.Provider>
    );
}

export function usePageTitle(title: string) {
    const setTitle = useContext(PageTitleSetterContext);

    useEffect(() => {
        setTitle(title);
        document.title = `${title} • THOR`;
        return () => {
            setTitle("");
            document.title = "THOR";
        };
    }, [title, setTitle]);
}

export function useCurrentPageTitle() {
    return useContext(PageTitleValueContext);
}
